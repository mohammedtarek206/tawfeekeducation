import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import User from '@/lib/db/models/User';
import Subscription from '@/lib/db/models/Subscription';
import Notification from '@/lib/db/models/Notification';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { assignFreeSlotAtomically, getFreeOfferStats, getFreeOfferSettings } from '@/lib/settings/freeOffer';

// POST /api/student/subscriptions/claim
async function postHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const planId = body.planId;

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

    let plan = null;
    if (planId) {
        plan = await SubscriptionPlan.findById(planId);
        if (plan && plan.grade !== student.grade) {
            return NextResponse.json({ success: false, message: 'هذه الباقة لا تطابق صفك الدراسي' }, { status: 400 });
        }
    }

    const stats = await getFreeOfferStats();
    const offerSettings = await getFreeOfferSettings();
    if (!stats.isOfferActive) {
        return NextResponse.json({
            success: false,
            message: 'نأسف، لقد اكتمل الحد الأقصى للعرض المجاني أو أن العرض موقوف حالياً'
        }, { status: 400 });
    }

    const result = await assignFreeSlotAtomically(student._id.toString(), student.grade);
    if (!result.assigned) {
        return NextResponse.json({
            success: false,
            message: 'نأسف، تعذر تفعيل العرض المجاني. ربما اكتملت المقاعد الأخيرة أو الباقة غير متاحة لصفك الدراسي'
        }, { status: 400 });
    }

    if (plan) {
        student.currentPlan = plan._id;
        await student.save();

        if (plan.offerEnabled && plan.offerType === 'FREE_FIRST_N') {
            plan.offerUsed += 1;
            await plan.save();
        }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + offerSettings.freeOfferDuration);

    // Create real Subscription record
    await Subscription.create({
        studentId: student._id,
        planId: plan?._id,
        gradeId: student.grade,
        status: 'active',
        source: 'free_offer',
        startDate,
        endDate,
        notes: `العرض المجاني - مقعد #${result.slotNumber}`,
    });

    // Create Notification
    await Notification.create({
        user: student._id,
        type: 'announcement',
        title: 'تهانينا! تم تفعيل العرض المجاني 🎁',
        message: `تم تفعيل اشتراكك المجاني لصف ${student.grade} بنجاح.`,
    });

    return NextResponse.json({
        success: true,
        message: 'تهانينا! تم تفعيل اشتراكك المجاني بنجاح 🎉',
        data: { activated: true, freeSlotNumber: result.slotNumber }
    });
}

export const POST = withStudent(postHandler);

