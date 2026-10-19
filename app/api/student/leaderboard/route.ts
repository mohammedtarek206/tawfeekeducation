import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import HonorBoard from '@/lib/db/models/HonorBoard';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(
    _req: NextRequest,
    _ctx: unknown,
    currentStudent: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    // Fetch students approved by admin in HonorBoard, strictly following the manual rank
    const entries = await HonorBoard.find()
        .sort({ rank: 1, createdAt: 1 })
        .populate({
            path: 'student',
            select: 'name avatar grade points level status',
        })
        .lean();

    // Filter valid approved students, strip any sensitive data
    const leaderboard = entries
        .filter((e: any) => e.student && e.student.status !== 'suspended')
        .map((e: any) => {
            const studentId = e.student._id.toString();
            return {
                rank: e.rank,
                studentId,
                name: e.student.name || 'طالب متميز',
                avatar: e.student.avatar || null,
                grade: e.student.grade || '',
                level: e.student.level || 1,
                points: typeof e.student.points === 'number' ? e.student.points : 0,
                note: e.note || '',
                isMe: studentId === currentStudent.userId,
            };
        });

    const myEntry = leaderboard.find((item) => item.isMe);
    const myRank = myEntry ? myEntry.rank : null;

    const response = NextResponse.json({
        success: true,
        data: {
            leaderboard,
            totalHonored: leaderboard.length,
            myRank,
            isInHonorBoard: Boolean(myEntry),
            topStudentName: leaderboard[0]?.name ?? null,
            lastUpdated: new Date().toISOString(),
        },
    });

    // Ensure no caching so updates by admin reflect immediately
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
}

export const GET = withStudent(handler);
