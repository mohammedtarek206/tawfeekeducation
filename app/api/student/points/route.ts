import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getLeaderboard, getStudentRank } from '@/lib/gamification/engine';
import { getHonorBoardSettings } from '@/lib/settings/honorBoard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('name points level grade avatar');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const transactions = await PointTransaction.find({ student: student.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const settings = await getHonorBoardSettings();

    // جلب أفضل 5 طلاب في لوحة الشرف التلقائية
    const leaderboardRaw = await getLeaderboard({
        limit: 5,
        includeZeroPoints: settings.showZeroPoints,
    });

    const leaderboard = leaderboardRaw.map((s) => ({
        rank: s.rank,
        studentId: s.studentId,
        name: s.name,
        points: s.points,
        level: s.level,
        grade: s.grade,
    }));

    // مركز الطالب الحالي الفعلي
    const currentRank = (await getStudentRank(student.userId, { includeZeroPoints: settings.showZeroPoints })) || 0;

    const formattedTransactions = transactions.map((t: any) => ({
        id: t._id,
        amount: t.amount,
        type: t.type,
        reason: t.reason,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
    }));

    const response = NextResponse.json({
        success: true,
        data: {
            balance: studentUser.points || 0,
            level: studentUser.level || 1,
            rank: currentRank,
            leaderboard,
            transactions: formattedTransactions,
        },
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
}

export const GET = withStudent(handler);
