import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Lesson from '@/lib/db/models/Lesson';
import Quiz from '@/lib/db/models/Quiz';
import Exam from '@/lib/db/models/Exam';
import Booking from '@/lib/db/models/Booking';
import Referral from '@/lib/db/models/Referral';
import PointTransaction from '@/lib/db/models/PointTransaction';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import { withAdmin } from '@/lib/auth/middleware';
import { getFreeOfferStats } from '@/lib/settings/freeOffer';

export const revalidate = 0;

async function handler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const freeOfferStats = await getFreeOfferStats();

    const [
        totalStudents,
        activeStudents,
        pendingStudents,
        suspendedStudents,
        rejectedStudents,
        freeStudents,
        activeSubscriptionsCount,
        expiredSubscriptionsCount,
        pendingPaymentsCount,
        totalLessons,
        publishedLessons,
        totalQuizzes,
        weeklyExams,
        monthlyExams,
        totalBookings,
        pendingBookings,
        totalReferrals,
        rewardedReferrals,
        totalParents,
        pointsAgg,
    ] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'student', status: 'approved' }),
        User.countDocuments({ role: 'student', status: 'pending' }),
        User.countDocuments({ role: 'student', status: 'suspended' }),
        User.countDocuments({ role: 'student', status: 'rejected' }),
        User.countDocuments({ role: 'student', isFreeStudent: true }),
        User.countDocuments({ role: 'student', subscriptionStatus: 'active' }),
        User.countDocuments({ role: 'student', subscriptionStatus: 'expired' }),
        PaymentRequest.countDocuments({ status: 'pending' }),
        Lesson.countDocuments({}),
        Lesson.countDocuments({ isPublished: true }),
        Quiz.countDocuments({}),
        Exam.countDocuments({ type: 'weekly' }),
        Exam.countDocuments({ type: 'monthly' }),
        Booking.countDocuments({}),
        Booking.countDocuments({ status: 'pending' }),
        Referral.countDocuments({}),
        Referral.countDocuments({ status: 'rewarded' }),
        User.countDocuments({ role: 'parent' }),
        PointTransaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const totalPointsAwarded = pointsAgg[0]?.total || 0;

    // Recent registrations for chart (last 7 days)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const registrationsByDay = await User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: last7Days } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
        success: true,
        data: {
            students: {
                total: totalStudents,
                active: activeStudents,
                pending: pendingStudents,
                suspended: suspendedStudents,
                rejected: rejectedStudents,
                free: freeStudents,
                freeSlotsFilled: freeOfferStats.freeStudentsCount,
                freeSlotRemaining: freeOfferStats.remainingSlots,
                freeLimit: freeOfferStats.freeStudentsLimit,
                usagePercentage: freeOfferStats.usagePercentage,
                freeOfferEnabled: freeOfferStats.freeOfferEnabled,
                isOfferActive: freeOfferStats.isOfferActive,
                isLimitExceeded: freeOfferStats.isLimitExceeded,
                activeSubscriptions: activeSubscriptionsCount,
                expiredSubscriptions: expiredSubscriptionsCount,
                pendingPayments: pendingPaymentsCount,
            },
            content: {
                totalLessons,
                publishedLessons,
                totalQuizzes,
                weeklyExams,
                monthlyExams,
            },
            bookings: {
                total: totalBookings,
                pending: pendingBookings,
            },
            referrals: {
                total: totalReferrals,
                rewarded: rewardedReferrals,
            },
            parents: totalParents,
            gamification: {
                totalPointsAwarded,
            },
            charts: {
                registrationsByDay,
            },
        },
    });
}

export const GET = withAdmin(handler);
