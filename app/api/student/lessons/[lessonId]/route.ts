import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/student/lessons/[lessonId]
async function getHandler(
    req: NextRequest,
    ctx: any,
    student: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('grade subscriptionStatus subscriptionEndDate');
    if (!studentUser) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });

    const lesson = await Lesson.findOne({
        _id: ctx.params.lessonId,
        isPublished: true,
        grade: studentUser.grade,
    }).lean();

    if (!lesson) return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });

    // Validate Subscription
    if (!lesson.isFree) {
        if (studentUser.subscriptionStatus !== 'active' || (studentUser.subscriptionEndDate && new Date() > new Date(studentUser.subscriptionEndDate))) {
            return NextResponse.json({ success: false, message: 'هذا المحتوى مدفوع، يرجى الاشتراك للوصول إليه', requireSubscription: true }, { status: 403 });
        }
    }

    return NextResponse.json({ success: true, data: { lesson } });
}

export const GET = withStudent(getHandler);
