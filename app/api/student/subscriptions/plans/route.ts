import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import User from '@/lib/db/models/User';
import { getFreeOfferStats, getFreeOfferSettings } from '@/lib/settings/freeOffer';

export const revalidate = 0;

// GET /api/student/subscriptions/plans
async function getHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const PaymentRequest = (await import('@/lib/db/models/PaymentRequest')).default;

    const student = await User.findById(studentPayload.userId).populate('currentPlan').lean() as any;
    if (!student) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    const freeOfferStats = await getFreeOfferStats();
    const freeOfferSettings = await getFreeOfferSettings();

    const plans = await SubscriptionPlan.find({ grade: student.grade, active: true }).sort({ createdAt: -1 }).lean();
    const requestsHistory = await PaymentRequest.find({ studentId: student._id })
        .populate('planId', 'name type price')
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json({
        success: true,
        data: {
            plans,
            studentGrade: student.grade,
            accountStatus: student.status,
            subscriptionStatus: student.subscriptionStatus,
            isFreeStudent: Boolean(student.isFreeStudent),
            freeSlotNumber: student.freeSlotNumber,
            currentPlan: student.currentPlan,
            subscriptionStartDate: student.subscriptionStartDate,
            subscriptionEndDate: student.subscriptionEndDate,
            rejectionReason: student.rejectionReason,
            requestsHistory,
            freeOfferStats,
            freeOfferSettings,
        },
    });
}

export const GET = withStudent(getHandler);
