import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import User from '@/lib/db/models/User';
import Subscription from '@/lib/db/models/Subscription';
import Notification from '@/lib/db/models/Notification';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// PUT /api/admin/subscriptions/requests/[id]
async function putHandler(req: NextRequest, ctx: any, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const { id } = ctx.params;
    const body = await req.json();
    const { status, adminNote } = body;

    if (!['approved', 'rejected'].includes(status)) {
        return NextResponse.json({ success: false, message: 'حالة غير صالحة' }, { status: 400 });
    }

    const request = await PaymentRequest.findById(id).populate('planId');
    if (!request) {
        return NextResponse.json({ success: false, message: 'الطلب غير موجود' }, { status: 404 });
    }

    if (request.status !== 'pending') {
        return NextResponse.json({ success: false, message: 'تمت مراجعة هذا الطلب مسبقاً' }, { status: 400 });
    }

    request.status = status;
    request.adminNote = adminNote;
    request.reviewedBy = admin.userId as any;
    request.reviewedAt = new Date();

    if (status === 'approved') {
        const student = await User.findById(request.studentId);
        const plan = request.planId as any;

        if (student && plan) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.durationInDays);

            student.subscriptionStatus = 'active';
            student.currentPlan = plan._id;
            student.subscriptionStartDate = startDate;
            student.subscriptionEndDate = endDate;
            student.rejectionReason = undefined;

            // Increment offerUsed if this was a discount offer
            if (plan.offerEnabled && plan.offerType === 'DISCOUNT_FIRST_N' && plan.offerUsed < plan.offerLimit) {
                plan.offerUsed += 1;
                await plan.save();
            }

            await student.save();

            // Create real Subscription record
            await Subscription.create({
                studentId: student._id,
                planId: plan._id,
                gradeId: student.grade || plan.grade,
                status: 'active',
                source: 'payment',
                startDate,
                endDate,
                paymentRequestId: request._id,
            });

            // Create Notification
            await Notification.create({
                user: student._id,
                type: 'announcement',
                title: 'تم قبول طلب الاشتراك 🎉',
                message: `تم تفعيل اشتراكك في باقة "${plan.name}" بنجاح حتى تاريخ ${endDate.toLocaleDateString('ar-EG')}.`,
            });

            // Evaluate referral qualification (if rule is on_active_subscription or on_first_payment)
            const { evaluateReferralForStudent } = await import('@/lib/referrals/processor');
            await evaluateReferralForStudent(student._id.toString(), 'subscription', admin.userId);
        }
    } else if (status === 'rejected') {
        const student = await User.findById(request.studentId);
        if (student && student.subscriptionStatus === 'pending') {
            student.subscriptionStatus = 'rejected';
            student.rejectionReason = adminNote || 'تم رفض طلب الاشتراك من الإدارة';
            await student.save();

            // Create Notification
            await Notification.create({
                user: student._id,
                type: 'announcement',
                title: 'تم رفض طلب الاشتراك ❌',
                message: adminNote ? `سبب الرفض: ${adminNote}` : 'تم رفض طلب الاشتراك من قبل الإدارة.',
            });
        }
    }

    await request.save();

    return NextResponse.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح', data: { request } });
}

export const PUT = withAdmin(putHandler);

