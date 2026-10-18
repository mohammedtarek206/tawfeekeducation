import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

async function handler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(100, Math.max(5, isNaN(limitParam) ? 50 : limitParam));

    // Fetch approved students sorted by points desc
    const students = await User.find({ role: 'student', status: 'approved' })
        .select('_id name points level grade avatar')
        .sort({ points: -1, level: -1 })
        .limit(limit)
        .lean() as Array<{
            _id: { toString(): string };
            name: string;
            points: number;
            level: number;
            grade?: string;
            avatar?: string;
        }>;

    // Build rank with tie detection
    type Entry = {
        rank: number;
        studentId: string;
        name: string;
        points: number;
        level: number;
        grade: string;
        avatar: string | null;
        isMe: boolean;
    };

    const leaderboard: Entry[] = [];
    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        let rank = i + 1;
        if (i > 0) {
            const prev = students[i - 1];
            if (prev.points === s.points && prev.level === s.level) {
                rank = leaderboard[i - 1].rank;
            }
        }
        leaderboard.push({
            rank,
            studentId: s._id.toString(),
            name: s.name,
            points: s.points || 0,
            level: s.level || 1,
            grade: s.grade || '',
            avatar: s.avatar || null,
            isMe: s._id.toString() === student.userId,
        });
    }

    // Get the current student's rank if not in the top list
    const myEntry = leaderboard.find(e => e.isMe);
    let myRank: number | null = myEntry?.rank ?? null;

    if (!myRank) {
        const me = await User.findById(student.userId).select('points').lean() as { points?: number } | null;
        if (me) {
            const above = await User.countDocuments({
                role: 'student',
                status: 'approved',
                points: { $gt: me.points || 0 },
            });
            myRank = above + 1;
        }
    }

    const topStudent = leaderboard[0] ?? null;

    return NextResponse.json({
        success: true,
        data: {
            leaderboard,
            myRank,
            totalStudents: await User.countDocuments({ role: 'student', status: 'approved' }),
            topStudentName: topStudent?.name ?? null,
            highestPoints: topStudent?.points ?? 0,
        },
    });
}

export const GET = withStudent(handler);
