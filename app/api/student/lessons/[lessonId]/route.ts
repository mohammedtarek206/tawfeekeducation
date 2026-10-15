import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
import LessonProgress from '@/lib/db/models/LessonProgress';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';

// GET /api/student/lessons/[lessonId]
async function getHandler(
    req: NextRequest,
    ctx: any,
    studentPayload: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(studentPayload.userId)
        .select('name grade status subscriptionStatus subscriptionEndDate')
        .lean() as any;
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 403 });
    }

    const lesson = await Lesson.findOne({
        _id: ctx.params.lessonId,
        isPublished: true,
        grade: studentUser.grade,
    }).lean() as any;

    if (!lesson) {
        return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });
    }

    // Server-side subscription access check
    const access = await checkStudentAccess(studentPayload.userId, {
        grade: studentUser.grade,
        isFreeContent: lesson.isFree,
    });

    if (!access.canAccess) {
        return NextResponse.json(
            {
                success: false,
                message:
                    access.reason === 'pending_approval'
                        ? 'حسابك ما زال قيد المراجعة من الإدارة'
                        : access.reason === 'subscription_expired'
                            ? 'انتهى اشتراكك، يرجى التجديد للوصول إلى الحصة'
                            : 'هذا المحتوى متاح للمشتركين فقط، يرجى الاشتراك للوصول إليها',
                reason: access.reason,
                requireSubscription: true,
            },
            { status: 403 }
        );
    }

    // Fetch existing watch progress to restore last position
    const watchProgress = await LessonProgress.findOne({
        student: studentPayload.userId,
        lesson: lesson._id,
    }).select('watchedPercentage lastWatchedPosition isCompleted pointsAwarded').lean() as any;

    return NextResponse.json({
        success: true,
        data: {
            lesson,
            studentName: studentUser.name,
            watchProgress: watchProgress
                ? {
                    watchedPercentage: watchProgress.watchedPercentage || 0,
                    lastWatchedPosition: watchProgress.lastWatchedPosition || 0,
                    isCompleted: watchProgress.isCompleted || false,
                    pointsAwarded: watchProgress.pointsAwarded || false,
                }
                : null,
        },
    });
}

export const GET = withStudent(getHandler);
