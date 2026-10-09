import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getLeaderboard, getStudentRank } from '@/lib/gamification/engine';

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

    const rank = await getStudentRank(student.userId);
    const leaderboard = await getLeaderboard(5);

    const formattedTransactions = transactions.map((t: any) => ({
        id: t._id,
        amount: t.amount,
        type: t.type,
        reason: t.reason,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
    }));

    return NextResponse.json({
        success: true,
        data: {
            balance: studentUser.points || 0,
            level: studentUser.level || 1,
            rank,
            leaderboard,
            transactions: formattedTransactions,
        },
    });
}

export const GET = withStudent(handler);
