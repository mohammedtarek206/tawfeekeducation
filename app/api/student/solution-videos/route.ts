import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SolutionVideo from '@/lib/db/models/SolutionVideo';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';

// GET /api/student/solution-videos
async function getHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    try {
        await connectDB();

        const studentUser = await User.findById(studentPayload.userId)
            .select('name grade status subscriptionStatus subscriptionEndDate')
            .lean() as any;

        if (!studentUser) {
            return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 403 });
        }

        // Server-side access check
        const access = await checkStudentAccess(studentPayload.userId, { grade: studentUser.grade });

        if (!access.canAccess) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        access.reason === 'pending_approval'
                            ? 'حسابك ما زال قيد المراجعة من الإدارة'
                            : access.reason === 'subscription_expired'
                                ? 'انتهى اشتراكك، يرجى التجديد للوصول إلى فيديوهات الحل'
                                : 'فيديوهات الحل متاحة للمشتركين فقط، يرجى الاشتراك للوصول إليها',
                    reason: access.reason,
                    requireSubscription: true,
                },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const lessonId = searchParams.get('lessonId');
        const query: any = { isPublished: true };

        if (studentUser.grade && studentUser.grade.trim() !== '') {
            query.grade = studentUser.grade;
        }

        if (lessonId) {
            query.lesson = lessonId;
        }

        const videos = await SolutionVideo.find(query)
            .populate('lesson', 'title unit')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                videos,
                studentName: studentUser.name || 'طالب منصة التوفيق',
            },
        });
    } catch (error) {
        console.error('Student Solution Videos GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء جلب فيديوهات الحل' }, { status: 500 });
    }
}

export const GET = withStudent(getHandler);
