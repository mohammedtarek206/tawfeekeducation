import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LessonProgress from '@/lib/db/models/LessonProgress';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints, updateStreak, getGamificationSettings } from '@/lib/gamification/engine';
import { checkAndAwardAchievements } from '@/lib/utils/achievements';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';
import mongoose from 'mongoose';

/**
 * POST /api/student/lessons/complete
 *
 * Student presses "تأكيد إتمام المشاهدة" button.
 *
 * SECURITY CHECKS (all server-side):
 *   1. Student must be authenticated.
 *   2. Lesson must exist and be published for student's grade.
 *   3. Student must have valid subscription/access rights to this lesson.
 *   4. Progress record must exist (student must have sent at least one heartbeat).
 *   5. uniqueSecondsWatched / authDuration >= REQUIRED_WATCH_RATIO (50%).
 *      We do NOT trust watchedPercentage sent from the client.
 *   6. If already completed + points awarded → return existing state (idempotent).
 *   7. Points are awarded atomically with concurrency protection.
 *
 * REQUIRED_WATCH_RATIO: 0.50 (50% of video duration must be unique watched seconds)
 */

const REQUIRED_WATCH_RATIO = 0.50; // 50%

async function completeHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { lessonId } = body;

    if (!lessonId) {
        return NextResponse.json({ success: false, message: 'معرف الحصة مطلوب' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return NextResponse.json({ success: false, message: 'معرف الحصة غير صحيح' }, { status: 400 });
    }

    // ── 1. Verify student and grade ───────────────────────────────────────────
    const studentUser = await User.findById(student.userId).select('name grade status');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 });
    }

    // ── 2. Verify lesson ───────────────────────────────────────────────────────
    const studentGrade = studentUser.grade;
    const gradeFilter = studentGrade === 'second_secondary' || studentGrade === 'second_secondary_baccalaureate'
        ? { $in: ['second_secondary', 'second_secondary_baccalaureate'] }
        : studentGrade;

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isPublished: true,
        ...(studentGrade ? { grade: gradeFilter } : {}),
    }).select('title points completionThreshold duration isFree');

    if (!lesson) {
        return NextResponse.json({ success: false, message: 'الحصة غير موجودة أو غير متاحة لصفك الدراسي' }, { status: 404 });
    }

    // ── 3. Check Subscription & Content Access ─────────────────────────────────
    const access = await checkStudentAccess(student.userId, {
        grade: studentUser.grade,
        isFreeContent: lesson.isFree,
    });

    if (!access.canAccess) {
        return NextResponse.json(
            {
                success: false,
                message: 'ليس لديك صلاحية الوصول لهذه الحصة. يرجى تجديد أو تفعيل الاشتراك.',
                reason: access.reason,
            },
            { status: 403 }
        );
    }

    // ── 4. Load progress ───────────────────────────────────────────────────────
    const progress = await LessonProgress.findOne({
        student: student.userId,
        lesson: lessonId,
    });

    if (!progress) {
        return NextResponse.json(
            {
                success: false,
                message: 'لم يتم تسجيل أي تقدم في مشاهدة هذه الحصة. ابدأ المشاهدة أولاً.',
                requiredPercentage: Math.round(REQUIRED_WATCH_RATIO * 100),
                currentPercentage: 0,
            },
            { status: 403 }
        );
    }

    // ── 5. Idempotency Check: already completed & awarded ─────────────────────
    if (progress.isCompleted && progress.pointsAwarded) {
        return NextResponse.json({
            success: true,
            alreadyCompleted: true,
            data: {
                isCompleted: true,
                pointsAwarded: true,
                watchedPercentage: progress.watchedPercentage,
                message: 'تم إتمام هذه الحصة مسبقاً ولا يتم تكرار منح النقاط.',
            },
        });
    }

    // ── 6. Verify watch ratio server-side ──────────────────────────────────────
    const authDuration = lesson.duration && lesson.duration > 0 ? lesson.duration : null;

    let serverWatchedPct: number;
    if (authDuration && progress.uniqueSecondsWatched > 0) {
        serverWatchedPct = Math.min(100, Math.round((progress.uniqueSecondsWatched / authDuration) * 100));
    } else if (progress.uniqueSecondsWatched > 0 && progress.watchedPercentage > 0) {
        serverWatchedPct = progress.watchedPercentage;
    } else {
        serverWatchedPct = progress.watchedPercentage;
    }

    const requiredPct = Math.round(REQUIRED_WATCH_RATIO * 100);

    if (serverWatchedPct < requiredPct) {
        return NextResponse.json(
            {
                success: false,
                message: `يجب مشاهدة ${requiredPct}% على الأقل من الفيديو لإتمامه والحصول على النقاط. لقد شاهدت ${serverWatchedPct}% حتى الآن.`,
                requiredPercentage: requiredPct,
                currentPercentage: serverWatchedPct,
            },
            { status: 403 }
        );
    }

    // ── 7. Atomic update & Idempotent Points Awarding ──────────────────────────
    // Use findOneAndUpdate with condition pointsAwarded: false to prevent race conditions
    const updatedProgress = await LessonProgress.findOneAndUpdate(
        {
            _id: progress._id,
            // If pointsAwarded is false, we claim it atomically
            pointsAwarded: false,
        },
        {
            $set: {
                isCompleted: true,
                completedAt: progress.completedAt || new Date(),
                watchedPercentage: Math.max(progress.watchedPercentage, serverWatchedPct),
                pointsAwarded: true,
            },
        },
        { new: true }
    );

    let pointsResult = null;
    let pointsAwarded = false;

    if (updatedProgress) {
        // We won the race to award points
        const gamificationSettings = await getGamificationSettings();
        const pointsAmount = lesson.points || gamificationSettings.lessonCompletePoints || 10;

        const result = await awardPoints({
            studentId: student.userId,
            amount: pointsAmount,
            type: 'lesson_completed',
            reason: `إكمال حصة: ${lesson.title}`,
            referenceId: lessonId,
            referenceType: 'Lesson',
            idempotencyKey: `lesson_complete_${student.userId}_${lessonId}`,
        });

        if (result.success) {
            pointsAwarded = true;
            pointsResult = result;

            // Update streak and check achievements asynchronously
            updateStreak(student.userId).catch(() => { });
            checkAndAwardAchievements(student.userId).catch(() => { });
        }
    } else {
        // Another concurrent request already marked pointsAwarded: true
        pointsAwarded = true;
    }

    return NextResponse.json({
        success: true,
        data: {
            isCompleted: true,
            pointsAwarded,
            watchedPercentage: serverWatchedPct,
            pointsResult,
            message: pointsAwarded && pointsResult ? 'تم إتمام الحصة ومنح النقاط بنجاح! 🎉' : 'تم إتمام الحصة بنجاح.',
        },
    });
}

export const POST = withStudent(completeHandler);
