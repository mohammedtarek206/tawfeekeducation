import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import LessonProgress from '@/lib/db/models/LessonProgress';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';

// GET /api/student/lessons - get lessons with progress
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('grade');
    if (!studentUser) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filter: Record<string, any> = { isPublished: true };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        filter.grade = studentUser.grade;
    }

    const lessons = await Lesson.find(filter)
        .sort({ lessonNumber: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title lessonNumber unit description thumbnail youtubeId duration points grade subject isFree showOnHomepage')
        .lean();

    // Get progress for each lesson
    const lessonIds = lessons.map((l) => l._id);
    const progressList = await LessonProgress.find({
        student: student.userId,
        lesson: { $in: lessonIds },
    }).lean();

    const progressMap: Record<string, typeof progressList[0]> = {};
    progressList.forEach((p) => { progressMap[p.lesson.toString()] = p; });

    const total = await Lesson.countDocuments(filter);

    const lessonsWithProgress = lessons.map((l: any) => ({
        ...l,
        progress: progressMap[l._id.toString()] || null,
    }));

    return NextResponse.json({
        success: true,
        data: { lessons: lessonsWithProgress, total, page, pages: Math.ceil(total / limit) },
    });
}

export const GET = withStudent(getHandler);
