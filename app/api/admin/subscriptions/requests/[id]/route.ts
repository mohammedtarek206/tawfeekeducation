import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import User from '@/lib/db/models/User';
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
        }
    } else if (status === 'rejected') {
        const student = await User.findById(request.studentId);
        if (student && student.subscriptionStatus === 'pending') {
            student.subscriptionStatus = 'rejected';
            student.rejectionReason = adminNote || 'تم رفض طلب الاشتراك من الإدارة';
            await student.save();
        }
    }

    await request.save();

    return NextResponse.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح', data: { request } });
}

export const PUT = withAdmin(putHandler);
