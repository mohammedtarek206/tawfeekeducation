import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import HonorBoard from '@/lib/db/models/HonorBoard';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getLeaderboard, getStudentRank } from '@/lib/gamification/engine';

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

    // Check if there are admin-approved honor board students
    const honorEntries = await HonorBoard.find()
        .sort({ rank: 1, createdAt: 1 })
        .limit(5)
        .populate({ path: 'student', select: 'name points level grade' })
        .lean();

    let leaderboard: Array<{
        rank: number;
        studentId: string;
        name: string;
        points: number;
        level: number;
        grade?: string;
    }>;

    let rank: number;

    if (honorEntries.length > 0) {
        leaderboard = honorEntries
            .filter((e: any) => e.student)
            .map((e: any) => ({
                rank: e.rank,
                studentId: e.student._id.toString(),
                name: e.student.name,
                points: e.student.points || 0,
                level: e.student.level || 1,
                grade: e.student.grade,
            }));

        const myHonor = await HonorBoard.findOne({ student: student.userId });
        if (myHonor) {
            rank = myHonor.rank;
        } else {
            rank = await getStudentRank(student.userId);
        }
    } else {
        leaderboard = await getLeaderboard(5);
        rank = await getStudentRank(student.userId);
    }

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
