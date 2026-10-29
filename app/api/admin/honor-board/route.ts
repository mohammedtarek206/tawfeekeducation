import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getLeaderboard } from '@/lib/gamification/engine';
import {
    getHonorBoardSettings,
    updateHonorBoardSettings,
    HonorBoardSettings,
} from '@/lib/settings/honorBoard';
import { ACTIVE_GRADES } from '@/lib/constants/grades';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/honor-board - جلب لوحة الشرف التلقائية وإعداداتها وإحصائياتها للأدمن
async function getHandler(
    req: NextRequest,
    _ctx: unknown,
    _admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const gradeParam = searchParams.get('grade')?.trim() || '';
        const searchParam = searchParams.get('search')?.trim() || '';
        const limitParam = parseInt(searchParams.get('limit') || '50', 10);
        const limit = isNaN(limitParam) ? 50 : Math.min(200, Math.max(5, limitParam));

        // جلب الإعدادات الحالية للوحة الشرف
        const settings = await getHonorBoardSettings();

        // في واجهة الأدمن، يمكنه فحص القائمة مع أو بدون أصحاب النقاط الصفرية
        const showZeroParam = searchParams.get('showZero');
        const includeZeroPoints =
            showZeroParam !== null
                ? showZeroParam === 'true' || showZeroParam === '1'
                : settings.showZeroPoints;

        // جلب الطلاب المرتبين تلقائياً تنازلياً حسب النقاط
        const leaderboard = await getLeaderboard({
            limit,
            grade: gradeParam && gradeParam !== 'all' ? gradeParam : undefined,
            includeZeroPoints,
            search: searchParam || undefined,
        });

        // إحصائيات عامة لقاعدة البيانات
        const totalApprovedStudents = await User.countDocuments({
            role: 'student',
            status: 'approved',
        });

        const studentsWithPointsCount = await User.countDocuments({
            role: 'student',
            status: 'approved',
            points: { $gt: 0 },
        });

        // حساب أعلى رصيد ومتوسط النقاط
        const topStudent = leaderboard[0] || null;
        const highestPoints = topStudent ? topStudent.points : 0;

        const avgAgg = await User.aggregate([
            { $match: { role: 'student', status: 'approved', points: { $gt: 0 } } },
            { $group: { _id: null, avgPoints: { $avg: '$points' } } },
        ]);
        const averagePoints = avgAgg[0]?.avgPoints ? Math.round(avgAgg[0].avgPoints) : 0;

        const response = NextResponse.json({
            success: true,
            data: {
                settings,
                leaderboard,
                stats: {
                    totalApprovedStudents,
                    studentsWithPointsCount,
                    totalRankedInView: leaderboard.length,
                    topStudentName: topStudent?.name ?? null,
                    highestPoints,
                    averagePoints,
                    lastUpdated: new Date().toISOString(),
                },
                availableGrades: ACTIVE_GRADES,
            },
        });

        response.headers.set(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        );
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board GET] error:', message);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ في الخادم أثناء جلب لوحة الشرف', detail: message },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/honor-board - تحديث إعدادات لوحة الشرف
async function patchHandler(
    req: NextRequest,
    _ctx: unknown,
    admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, message: 'طلب غير صالح' }, { status: 400 });
        }

        const updates: Partial<HonorBoardSettings> = {};

        if (body.enabled !== undefined) {
            updates.enabled = Boolean(body.enabled);
        }

        if (body.limit !== undefined) {
            const parsedLimit = Number(body.limit);
            if (isNaN(parsedLimit) || parsedLimit < 5 || parsedLimit > 100) {
                return NextResponse.json(
                    { success: false, message: 'عدد الطلاب يجب أن يكون بين 5 و 100' },
                    { status: 400 }
                );
            }
            updates.limit = parsedLimit;
        }

        if (body.viewMode !== undefined) {
            if (body.viewMode !== 'all' && body.viewMode !== 'by_grade') {
                return NextResponse.json(
                    { success: false, message: 'نمط العرض غير صالح (all أو by_grade)' },
                    { status: 400 }
                );
            }
            updates.viewMode = body.viewMode;
        }

        if (body.showZeroPoints !== undefined) {
            updates.showZeroPoints = Boolean(body.showZeroPoints);
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, message: 'لم يتم إرسال أي إعدادات للتحديث' },
                { status: 400 }
            );
        }

        const newSettings = await updateHonorBoardSettings(updates, admin.userId);

        return NextResponse.json({
            success: true,
            message: 'تم حفظ إعدادات لوحة الشرف بنجاح',
            data: { settings: newSettings },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board PATCH] error:', message);
        return NextResponse.json(
            { success: false, message: 'فشل حفظ إعدادات لوحة الشرف', detail: message },
            { status: 500 }
        );
    }
}

export const GET = withAdmin(getHandler);
export const PATCH = withAdmin(patchHandler);
