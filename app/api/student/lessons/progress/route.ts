import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LessonProgress from '@/lib/db/models/LessonProgress';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints, getGamificationSettings } from '@/lib/gamification/engine';
import { updateStreak } from '@/lib/gamification/engine';
import { checkAndAwardAchievements } from '@/lib/utils/achievements';
import mongoose from 'mongoose';

/**
 * POST /api/student/lessons/progress — legacy endpoint kept for backward compat.
 *
 * New flow: use /heartbeat for segment tracking + /complete for completion.
 * This endpoint still works for direct VideoPlayer saves but enforces the
 * 50% threshold for completion/points (ignores client watchedPercentage for
 * completion — relies on server-stored progress instead).
 */
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

    // ── IMPORTANT: completion/points ONLY via /complete endpoint which verifies
    //   actual watched segments. This endpoint only saves raw progress.
    // ─────────────────────────────────────────────────────────────────────────

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
            isCompleted: false,
            pointsAwarded: false,
            watchSessions: 1,
        });
    } else {
        const updateData: Record<string, unknown> = {
            watchedPercentage: Math.max(existing.watchedPercentage, safePercentage),
            lastWatchedPosition: lastWatchedPosition || existing.lastWatchedPosition,
            $inc: { watchSessions: 1 },
        };

        await LessonProgress.findByIdAndUpdate(existing._id, updateData);
    }

    // Award watch start points (one time, for starting to watch)
    if (safePercentage > 5 && !existing?.pointsAwarded && !existing) {
        const gamificationSettings = await getGamificationSettings();
        const watchStartPoints = gamificationSettings.lessonWatchPoints;
        await awardPoints({
            studentId: student.userId,
            amount: watchStartPoints,
            type: 'lesson_watch',
            reason: `مشاهدة الحصة: ${lesson.title || 'حصة'}`,
            referenceId: lessonId,
            referenceType: 'Lesson',
            idempotencyKey: `lesson_watch_${student.userId}_${lessonId}`,
        });
    }

    return NextResponse.json({
        success: true,
        data: {
            isCompleted: existing?.isCompleted || false,
            watchedPercentage: safePercentage,
            pointsAwarded,
        },
    });
}

export const POST = withStudent(postHandler);
