import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
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

    const studentUser = await User.findById(studentPayload.userId).select('name grade status subscriptionStatus subscriptionEndDate').lean() as any;
    if (!studentUser) return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 403 });

    const lesson = await Lesson.findOne({
        _id: ctx.params.lessonId,
        isPublished: true,
        grade: studentUser.grade,
    }).lean() as any;

    if (!lesson) return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });

    // Enforce robust server-side subscription access control
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

    return NextResponse.json({
        success: true,
        data: {
            lesson,
            studentName: studentUser.name,
        },
    });
}

export const GET = withStudent(getHandler);

