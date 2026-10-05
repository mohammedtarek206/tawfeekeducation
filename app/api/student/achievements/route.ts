import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Achievement from '@/lib/db/models/Achievement';
import StudentAchievement from '@/lib/db/models/StudentAchievement';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import StudentTask from '@/lib/db/models/StudentTask';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

async function handler(_req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    // Get all published achievements
    const allAchievements = await Achievement.find({ isPublished: true }).sort({ requiredCount: 1 }).lean() as any[];

    // Get student's earned achievements
    const earned = await StudentAchievement.find({ student: student.userId })
        .populate('achievement')
        .lean() as any[];

    const earnedIds = new Set(earned.map((e: any) => e.achievement?._id?.toString()));

    // Get student stats for progress calculation
    const completedLessons = await LessonProgress.countDocuments({ student: student.userId, isCompleted: true });
    const completedExams = await ExamAttempt.countDocuments({ student: student.userId, status: 'submitted' });
    const completedTasks = await StudentTask.countDocuments({ student: student.userId, status: 'completed' });
    const studentUser = await User.findById(student.userId).select('points streak').lean() as any;

    const getProgress = (ach: any): number => {
        let current = 0;
        switch (ach.category) {
            case 'lessons': current = completedLessons; break;
            case 'exams': current = completedExams; break;
            case 'streak': current = studentUser?.streak || 0; break;
            case 'points': current = studentUser?.points || 0; break;
            case 'general': current = completedTasks; break;
        }
        return Math.min(100, Math.round((current / (ach.requiredCount || 1)) * 100));
    };

    const annotated = allAchievements.map((ach: any) => ({
        ...ach,
        isEarned: earnedIds.has(ach._id.toString()),
        earnedAt: earned.find((e: any) => e.achievement?._id?.toString() === ach._id.toString())?.earnedAt || null,
        progress: earnedIds.has(ach._id.toString()) ? 100 : getProgress(ach),
    }));

    const summary = {
        total: annotated.length,
        earned: annotated.filter(a => a.isEarned).length,
        totalPoints: earned.reduce((s: number, e: any) => s + (e.pointsEarned || 0), 0),
    };

    return NextResponse.json({ success: true, data: { achievements: annotated, summary } });
}

export const GET = withStudent(handler);
