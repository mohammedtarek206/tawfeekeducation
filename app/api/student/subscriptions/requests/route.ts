import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { paymentRequestSubmitSchema } from '@/lib/validation/schemas';

// GET /api/student/subscriptions/requests
async function getHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const requests = await PaymentRequest.find({ studentId: studentPayload.userId })
        .populate('planId', 'name type _id')
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json({
        success: true,
        data: { requests },
    });
}

// POST /api/student/subscriptions/requests
async function postHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const User = (await import('@/lib/db/models/User')).default;

    const student = await User.findById(studentPayload.userId);
    if (!student) {
        return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (student.status !== 'approved') {
        return NextResponse.json(
            { success: false, message: 'حسابك ما زال قيد المراجعة من الإدارة. لا يمكنك تقديم طلب اشتراك قبل تفعيل الحساب.' },
            { status: 403 }
        );
    }

    const body = await req.json();

    const parsed = paymentRequestSubmitSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const plan = await SubscriptionPlan.findById(parsed.data.planId);
    if (!plan || !plan.active) {
        return NextResponse.json({ success: false, message: 'الباقة غير متاحة حالياً' }, { status: 404 });
    }

    if (plan.grade !== student.grade) {
        return NextResponse.json({ success: false, message: 'هذه الباقة غير مخصصة لصفك الدراسي' }, { status: 400 });
    }

    // Check for any existing pending payment request for this student
    const existingReq = await PaymentRequest.findOne({
        studentId: studentPayload.userId,
        status: 'pending'
    });

    if (existingReq) {
        return NextResponse.json(
            { success: false, message: 'لديك بالفعل طلب اشتراك قيد المراجعة حالياً. يرجى الانتظار حتى تقوم الإدارة بمراجعته.' },
            { status: 400 }
        );
    }

    // Calculate actual trusted price on backend
    let amount = plan.price;
    if (plan.offerEnabled && plan.offerType === 'DISCOUNT_FIRST_N' && plan.offerUsed < plan.offerLimit) {
        if (plan.discountPercentage) {
            amount = plan.price - (plan.price * (plan.discountPercentage / 100));
        }
    }

    const request = await PaymentRequest.create({
        studentId: studentPayload.userId,
        planId: plan._id,
        amount,
        paymentMethod: parsed.data.paymentMethod,
        transactionRef: parsed.data.transactionRef || undefined,
        paymentProof: parsed.data.paymentProof,
        status: 'pending'
    });

    // Update user subscriptionStatus to pending so student UI reflects pending status
    student.subscriptionStatus = 'pending';
    await student.save();

    return NextResponse.json(
        { success: true, message: 'تم إرسال طلب الاشتراك بنجاح وجاري مراجعته من الإدارة', data: { request } },
        { status: 201 }
    );
}

export const GET = withStudent(getHandler);
export const POST = withStudent(postHandler);
