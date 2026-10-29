import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getLeaderboard, getStudentRank } from '@/lib/gamification/engine';
import { getHonorBoardSettings } from '@/lib/settings/honorBoard';
import { ACTIVE_GRADES } from '@/lib/constants/grades';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(
    req: NextRequest,
    _ctx: unknown,
    currentStudent: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    // 1. فحص إعدادات لوحة الشرف المعتمدة من الإدارة
    const settings = await getHonorBoardSettings();

    // 2. إذا تم إيقاف لوحة الشرف من قِبل الأدمن، نعيد رداً يوضح التوقف المؤقت
    if (!settings.enabled) {
        const response = NextResponse.json({
            success: true,
            data: {
                enabled: false,
                message: 'لوحة الشرف متوقفة مؤقتًا بقرار من إدارة المنصة',
                leaderboard: [],
                totalHonored: 0,
                myRank: null,
                isInHonorBoard: false,
                topStudentName: null,
                lastUpdated: new Date().toISOString(),
                settings: {
                    viewMode: settings.viewMode,
                    limit: settings.limit,
                },
                availableGrades: ACTIVE_GRADES,
            },
        });

        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    }

    // 3. تحديد الصف المطلوب تصفية النتائج بناءً عليه
    const { searchParams } = new URL(req.url);
    const requestedGrade = searchParams.get('grade')?.trim() || '';
    const gradeFilter = requestedGrade && requestedGrade !== 'all' ? requestedGrade : undefined;

    // 4. جلب الطلاب المرتبين أوتوماتيكياً حسب النقاط الفعلية
    const rawLeaderboard = await getLeaderboard({
        limit: settings.limit,
        grade: gradeFilter,
        includeZeroPoints: settings.showZeroPoints,
    });

    // 5. تهيئة البيانات للعرض وحجب أي بيانات حساسة كأرقام الهواتف
    const leaderboard = rawLeaderboard.map((item) => {
        const isMe = item.studentId === currentStudent.userId;
        return {
            rank: item.rank,
            studentId: item.studentId,
            name: item.name,
            avatar: item.avatar,
            grade: item.grade || '',
            level: item.level,
            points: item.points,
            isMe,
        };
    });

    // 6. حساب ترتيب الطالب الحالي الفعلي في النظام
    const myRank = await getStudentRank(currentStudent.userId, {
        grade: gradeFilter,
        includeZeroPoints: settings.showZeroPoints,
    });

    const myEntry = leaderboard.find((item) => item.isMe);

    const response = NextResponse.json({
        success: true,
        data: {
            enabled: true,
            leaderboard,
            totalHonored: leaderboard.length,
            myRank,
            isInHonorBoard: Boolean(myEntry),
            topStudentName: leaderboard[0]?.name ?? null,
            lastUpdated: new Date().toISOString(),
            settings: {
                viewMode: settings.viewMode,
                limit: settings.limit,
                showZeroPoints: settings.showZeroPoints,
            },
            availableGrades: ACTIVE_GRADES,
        },
    });

    // منع التخزين المؤقت لتحديث الترتيب فورياً بعد أي تعديل بالنقاط
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
}

export const GET = withStudent(handler);
