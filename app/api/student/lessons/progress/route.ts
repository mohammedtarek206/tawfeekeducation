import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LessonProgress from '@/lib/db/models/LessonProgress';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import { updateStreak } from '@/lib/gamification/engine';
import mongoose from 'mongoose';

// POST /api/student/lessons/progress - update video progress
async function postHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { lessonId, watchedPercentage, lastWatchedPosition } = body;

    if (!lessonId || watchedPercentage === undefined) {
        return NextResponse.json({ success: false, message: 'بيانات ناقصة' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return NextResponse.json({ success: false, message: 'معرف الحصة غير صحيح' }, { status: 400 });
    }

    // Verify lesson exists and belongs to student's grade
    const studentUser = await User.findById(student.userId).select('grade');
    const lesson = await Lesson.findOne({
        _id: lessonId,
        isPublished: true,
        grade: studentUser?.grade,
    }).select('points completionThreshold');

    if (!lesson) {
        return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });
    }

    const safePercentage = Math.min(100, Math.max(0, parseFloat(watchedPercentage)));
    const threshold = lesson.completionThreshold || parseInt(process.env.VIDEO_COMPLETION_THRESHOLD || '90');
    const shouldComplete = safePercentage >= threshold;

    // Find or create progress
    const existing = await LessonProgress.findOne({
        student: student.userId,
        lesson: lessonId,
    });

    let pointsAwarded = existing?.pointsAwarded || false;

    if (!existing) {
        await LessonProgress.create({
            student: student.userId,
            lesson: lessonId,
            watchedPercentage: safePercentage,
            lastWatchedPosition: lastWatchedPosition || 0,
            isCompleted: shouldComplete,
            completedAt: shouldComplete ? new Date() : undefined,
            pointsAwarded: false,
            watchSessions: 1,
        });
    } else {
        const updateData: Record<string, unknown> = {
            watchedPercentage: Math.max(existing.watchedPercentage, safePercentage),
            lastWatchedPosition: lastWatchedPosition || existing.lastWatchedPosition,
            $inc: { watchSessions: 1 },
        };

        if (shouldComplete && !existing.isCompleted) {
            updateData.isCompleted = true;
            updateData.completedAt = new Date();
        }

        await LessonProgress.findByIdAndUpdate(existing._id, updateData);
    }

    // Award completion points (only once)
    let pointsResult = null;
    if (shouldComplete && !pointsAwarded) {
        const watchPoints = parseInt(process.env.DEFAULT_LESSON_COMPLETE_POINTS || '10');

        const result = await awardPoints({
            studentId: student.userId,
            amount: watchPoints,
            type: 'lesson_completed',
            reason: 'إكمال الحصة',
            referenceId: lessonId,
            referenceType: 'Lesson',
        });

        if (result.success) {
            await LessonProgress.findOneAndUpdate(
                { student: student.userId, lesson: lessonId },
                { pointsAwarded: true }
            );
            pointsAwarded = true;
            pointsResult = result;
        }

        // Update streak
        await updateStreak(student.userId);
    } else if (safePercentage > 5 && !existing?.pointsAwarded) {
        // Award watch start points (one time)
        const watchStartPoints = parseInt(process.env.DEFAULT_LESSON_WATCH_POINTS || '5');
        if (!existing) {
            await awardPoints({
                studentId: student.userId,
                amount: watchStartPoints,
                type: 'lesson_watch',
                reason: 'مشاهدة الحصة',
                referenceId: lessonId,
                referenceType: 'Lesson',
            });
        }
    }

    return NextResponse.json({
        success: true,
        data: {
            isCompleted: shouldComplete,
            watchedPercentage: safePercentage,
            pointsAwarded,
            pointsResult,
        },
    });
}

export const POST = withStudent(postHandler);
