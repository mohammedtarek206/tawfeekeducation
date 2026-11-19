import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import LessonProgress from '@/lib/db/models/LessonProgress';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

/**
 * Merge overlapping segments and return sorted array.
 * Input: [[startSec, endSec], ...] — may overlap or be unordered.
 * Output: merged, non-overlapping, sorted segments.
 */
function mergeSegments(segments: Array<[number, number]>): Array<[number, number]> {
    if (!segments.length) return [];
    const sorted = [...segments].sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        if (sorted[i][0] <= last[1] + 1) {
            last[1] = Math.max(last[1], sorted[i][1]);
        } else {
            merged.push(sorted[i]);
        }
    }
    return merged;
}

/** Sum up unique seconds from merged segments */
function sumSegments(segments: Array<[number, number]>): number {
    return segments.reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
}

/**
 * POST /api/student/lessons/heartbeat
 *
 * Called every few seconds while the student is watching.
 * Body:
 *   - lessonId: string
 *   - segmentStart: number  (seconds, start of the current played segment)
 *   - segmentEnd:   number  (seconds, end of the current played segment)
 *   - duration:     number  (total video duration in seconds)
 *
 * Server merges the new segment into the stored segments,
 * recomputes uniqueSecondsWatched and watchedPercentage,
 * and returns the updated percentage.
 *
 * SECURITY NOTES:
 *   - Duration is validated against the lesson record (if stored) to prevent
 *     a student sending a fake small duration to inflate percentage.
 *   - If the lesson has no stored duration, we trust the client duration but
 *     cap percentage at 100.
 *   - Segment must be forward-only (segmentEnd > segmentStart).
 *   - Max segment length is capped at 30 seconds to prevent bulk fake segments.
 */
async function heartbeatHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { lessonId, segmentStart, segmentEnd, duration } = body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!lessonId || segmentStart === undefined || segmentEnd === undefined || !duration) {
        return NextResponse.json({ success: false, message: 'بيانات ناقصة' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return NextResponse.json({ success: false, message: 'معرف الحصة غير صحيح' }, { status: 400 });
    }

    const start = Math.max(0, parseFloat(segmentStart));
    const end = parseFloat(segmentEnd);
    const clientDuration = parseFloat(duration);

    // Reject zero or negative segments
    if (end <= start || clientDuration <= 0) {
        return NextResponse.json({ success: false, message: 'بيانات الجزء غير صحيحة' }, { status: 400 });
    }

    // Cap max segment length at 35 seconds (heartbeat should fire every ~5s)
    const segmentLength = end - start;
    if (segmentLength > 35) {
        return NextResponse.json({ success: false, message: 'طول الجزء مريب' }, { status: 400 });
    }

    // ── Load lesson ───────────────────────────────────────────────────────────
    const studentUser = await User.findById(student.userId).select('grade status');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 });
    }

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isPublished: true,
        grade: studentUser.grade,
    }).select('duration completionThreshold points isFree');

    if (!lesson) {
        return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });
    }

    // Check Access
    const { checkStudentAccess } = await import('@/lib/subscriptions/checkAccess');
    const access = await checkStudentAccess(student.userId, {
        grade: studentUser.grade,
        isFreeContent: lesson.isFree,
    });
    if (!access.canAccess) {
        return NextResponse.json({ success: false, message: 'لا تملك صلاحية الوصول لهذه الحصة' }, { status: 403 });
    }

    // ── Determine authoritative duration ─────────────────────────────────────
    // Use lesson.duration if stored; otherwise fall back to client-reported duration.
    // If client reports a duration much smaller than the stored one, reject.
    const authDuration = lesson.duration && lesson.duration > 0 ? lesson.duration : clientDuration;

    if (lesson.duration && lesson.duration > 0) {
        // Allow ±10% tolerance for HLS streams that may differ slightly
        if (clientDuration < lesson.duration * 0.5) {
            return NextResponse.json({ success: false, message: 'مدة الفيديو المُرسَلة غير صحيحة' }, { status: 400 });
        }
    }

    // Clamp segment to valid range
    const clampedStart = Math.min(start, authDuration);
    const clampedEnd = Math.min(end, authDuration);

    // ── Load or create progress ───────────────────────────────────────────────
    let progress = await LessonProgress.findOne({
        student: student.userId,
        lesson: lessonId,
    });

    const newSegment: [number, number] = [clampedStart, clampedEnd];

    if (!progress) {
        const merged = mergeSegments([newSegment]);
        const uniqueSecs = sumSegments(merged);
        const pct = Math.min(100, Math.round((uniqueSecs / authDuration) * 100));

        progress = await LessonProgress.create({
            student: student.userId,
            lesson: lessonId,
            watchedPercentage: pct,
            lastWatchedPosition: clampedEnd,
            isCompleted: false,
            pointsAwarded: false,
            watchSessions: 1,
            totalWatchTime: uniqueSecs,
            watchedSegments: merged,
            uniqueSecondsWatched: uniqueSecs,
        });

        return NextResponse.json({
            success: true,
            data: {
                watchedPercentage: pct,
                uniqueSecondsWatched: uniqueSecs,
                isCompleted: false,
                pointsAwarded: false,
            },
        });
    }

    // Merge new segment with existing segments
    const existingSegments: Array<[number, number]> = (progress.watchedSegments || []) as Array<[number, number]>;
    const merged = mergeSegments([...existingSegments, newSegment]);
    const uniqueSecs = sumSegments(merged);
    const pct = Math.min(100, Math.round((uniqueSecs / authDuration) * 100));

    // Update progress (don't mark isCompleted here — that's done via /complete endpoint)
    await LessonProgress.findByIdAndUpdate(progress._id, {
        watchedPercentage: pct,
        lastWatchedPosition: Math.max(progress.lastWatchedPosition, clampedEnd),
        watchedSegments: merged,
        uniqueSecondsWatched: uniqueSecs,
        totalWatchTime: uniqueSecs,
    });

    return NextResponse.json({
        success: true,
        data: {
            watchedPercentage: pct,
            uniqueSecondsWatched: uniqueSecs,
            isCompleted: progress.isCompleted,
            pointsAwarded: progress.pointsAwarded,
        },
    });
}

export const POST = withStudent(heartbeatHandler);
