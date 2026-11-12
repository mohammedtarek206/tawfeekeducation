import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { getLeaderboard } from '@/lib/gamification/engine';
import { getHonorBoardSettings } from '@/lib/settings/honorBoard';
import { ACTIVE_GRADES } from '@/lib/constants/grades';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/public/leaderboard
 * لوحة الشرف العامة — لا تتطلب تسجيل دخول
 * مخصصة للعرض العام وفهرسة Google
 * لا تُعيد أرقام الهواتف أو البريد الإلكتروني أو أي بيانات حساسة
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        // 1. فحص إعدادات لوحة الشرف
        const settings = await getHonorBoardSettings();

        if (!settings.enabled) {
            const res = NextResponse.json({
                success: true,
                data: {
                    enabled: false,
                    message: 'لوحة الشرف متوقفة مؤقتًا',
                    leaderboard: [],
                    totalHonored: 0,
                    lastUpdated: new Date().toISOString(),
                },
            });
            res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
            return res;
        }

        // 2. تصفية حسب الصف الدراسي (اختياري)
        const { searchParams } = new URL(req.url);
        const requestedGrade = searchParams.get('grade')?.trim() || '';
        const gradeFilter =
            requestedGrade && requestedGrade !== 'all' ? requestedGrade : undefined;

        // 3. جلب الطلاب المرتبين حسب النقاط (بيانات عامة فقط — بدون هاتف أو بريد)
        const rawLeaderboard = await getLeaderboard({
            limit: settings.limit,
            grade: gradeFilter,
            includeZeroPoints: settings.showZeroPoints,
        });

        // 4. تنقية البيانات — نُرجع فقط ما هو مناسب للعرض العام
        const leaderboard = rawLeaderboard.map((item) => ({
            rank: item.rank,
            name: item.name,
            avatar: item.avatar ?? null,
            grade: item.grade ?? '',
            level: item.level,
            points: item.points,
        }));

        const res = NextResponse.json({
            success: true,
            data: {
                enabled: true,
                leaderboard,
                totalHonored: leaderboard.length,
                topStudentName: leaderboard[0]?.name ?? null,
                lastUpdated: new Date().toISOString(),
                settings: {
                    viewMode: settings.viewMode,
                    limit: settings.limit,
                },
                availableGrades: ACTIVE_GRADES,
            },
        });

        // تخزين مؤقت بسيط 60 ثانية — Google يقرأ المحتوى بدون مشاكل
        res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
        return res;
    } catch (error) {
        console.error('[Public Leaderboard API]', error);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ في جلب بيانات لوحة الشرف' },
            { status: 500 }
        );
    }
}
