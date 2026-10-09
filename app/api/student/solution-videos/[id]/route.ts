import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SolutionVideo from '@/lib/db/models/SolutionVideo';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';
import mongoose from 'mongoose';

// GET /api/student/solution-videos/[id]
async function getHandler(req: NextRequest, ctx: any, studentPayload: JWTPayload): Promise<NextResponse> {
    try {
        await connectDB();
        const videoId = ctx.params.id;

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return NextResponse.json({ success: false, message: 'معرف غير صحيح' }, { status: 400 });
        }

        const studentUser = await User.findById(studentPayload.userId)
            .select('name grade status subscriptionStatus subscriptionEndDate')
            .lean() as any;

        if (!studentUser) {
            return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 403 });
        }

        const access = await checkStudentAccess(studentPayload.userId, { grade: studentUser.grade });

        if (!access.canAccess) {
            return NextResponse.json(
                {
                    success: false,
                    message: access.reason === 'subscription_expired'
                        ? 'انتهى اشتراكك، يرجى التجديد لمشاهدة فيديو الحل'
                        : 'فيديوهات الحل متاحة للمشتركين فقط',
                    reason: access.reason,
                    requireSubscription: true,
                },
                { status: 403 }
            );
        }

        const video = await SolutionVideo.findOneAndUpdate(
            { _id: videoId, isPublished: true },
            { $inc: { viewCount: 1 } },
            { new: true }
        )
            .populate('lesson', 'title unit description videoUrl youtubeUrl')
            .lean();

        if (!video) {
            return NextResponse.json({ success: false, message: 'فيديو الحل غير موجود أو غير منشور' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                video,
                studentName: studentUser.name || 'طالب منصة التوفيق',
            },
        });
    } catch (error) {
        console.error('Student Solution Video details error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ في تحميل الفيديو' }, { status: 500 });
    }
}

export const GET = withStudent(getHandler);
