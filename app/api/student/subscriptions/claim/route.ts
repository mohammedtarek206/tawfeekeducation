import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { assignFreeSlotAtomically, getFreeOfferStats } from '@/lib/settings/freeOffer';

// POST /api/student/subscriptions/claim
async function postHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const planId = body.planId;

    if (!planId) {
        return NextResponse.json({ success: false, message: 'معرف الباقة مطلوب' }, { status: 400 });
    }

    const student = await User.findById(studentPayload.userId);
    if (!student) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    if (student.status !== 'approved') {
        return NextResponse.json({ success: false, message: 'حسابك ما زال قيد المراجعة من الإدارة' }, { status: 403 });
    }

    if (student.isFreeStudent || student.subscriptionStatus === 'active') {
        return NextResponse.json({ success: false, message: 'لديك بالفعل اشتراك مفعّل بالمنصة' }, { status: 400 });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.active) {
        return NextResponse.json({ success: false, message: 'الباقة غير متاحة' }, { status: 404 });
    }

    if (plan.grade !== student.grade) {
        return NextResponse.json({ success: false, message: 'هذه الباقة لا تطابق صفك الدراسي' }, { status: 400 });
    }

    const stats = await getFreeOfferStats();
    if (!stats.isOfferActive) {
        return NextResponse.json({
            success: false,
            message: 'نأسف، لقد اكتمل الحد الأقصى للعرض المجاني أو أن العرض موقوف حالياً'
        }, { status: 400 });
    }

    const result = await assignFreeSlotAtomically(student._id.toString());
    if (!result.assigned) {
        return NextResponse.json({
            success: false,
            message: 'نأسف، تعذر تفعيل العرض المجاني. ربما اكتملت المقاعد الأخيرة'
        }, { status: 400 });
    }

    // Attach plan reference
    student.currentPlan = plan._id;
    await student.save();

    if (plan.offerEnabled && plan.offerType === 'FREE_FIRST_N') {
        plan.offerUsed += 1;
        await plan.save();
    }

    return NextResponse.json({
        success: true,
        message: 'تهانينا! تم تفعيل اشتراكك المجاني بنجاح 🎉',
        data: { activated: true, freeSlotNumber: result.slotNumber }
    });
}

export const POST = withStudent(postHandler);
