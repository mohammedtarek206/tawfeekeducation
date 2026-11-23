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
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Subscription from '@/lib/db/models/Subscription';
import AdminAlert from '@/lib/db/models/AdminAlert';
import { withAdmin } from '@/lib/auth/middleware';
import { getFreeOfferStats } from '@/lib/settings/freeOffer';

export const revalidate = 0;

async function handler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get('grade') || '';
    const unit = searchParams.get('unit') || '';
    const subscriptionStatus = searchParams.get('subscriptionStatus') || '';
    const activityLevel = searchParams.get('activityLevel') || '';
    const dateRange = searchParams.get('dateRange') || 'all';

    const now = new Date();

    // 1. Compute Date Range Filter
    let dateFilterStart: Date | null = null;
    if (dateRange === 'today') {
        dateFilterStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    } else if (dateRange === 'last_week') {
        dateFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'last_month') {
        dateFilterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 2. Build Student Base Filter
    const studentFilter: Record<string, any> = { role: 'student' };
    if (grade) {
        studentFilter.grade = grade;
    }

    if (dateFilterStart) {
        studentFilter.createdAt = { $gte: dateFilterStart };
    }

    if (subscriptionStatus === 'active') {
        studentFilter.subscriptionStatus = 'active';
    } else if (subscriptionStatus === 'expired') {
        studentFilter.$or = [
            { subscriptionStatus: 'expired' },
            { subscriptionEndDate: { $lt: now } },
        ];
    } else if (subscriptionStatus === 'free') {
        studentFilter.isFreeStudent = true;
    } else if (subscriptionStatus === 'paid') {
        studentFilter.subscriptionStatus = 'active';
        studentFilter.isFreeStudent = false;
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    if (activityLevel === 'highly_active') {
        studentFilter.lastLogin = { $gte: threeDaysAgo };
    } else if (activityLevel === 'moderate') {
        studentFilter.lastLogin = { $gte: sevenDaysAgo, $lt: threeDaysAgo };
    } else if (activityLevel === 'inactive') {
        studentFilter.$or = [
            { lastLogin: { $lt: sevenDaysAgo } },
            { lastLogin: { $exists: false } },
            { lastLogin: null },
        ];
    }

    // 3. Run queries
    const freeOfferStats = await getFreeOfferStats();

    // Student counts
    const [
        totalStudents,
        approvedStudents,
        pendingStudents,
        suspendedStudents,
        rejectedStudents,
        activeByLogin,
        inactiveByLogin,
    ] = await Promise.all([
        User.countDocuments(studentFilter),
        User.countDocuments({ ...studentFilter, status: 'approved' }),
        User.countDocuments({ ...studentFilter, status: 'pending' }),
        User.countDocuments({ ...studentFilter, status: 'suspended' }),
        User.countDocuments({ ...studentFilter, status: 'rejected' }),
        User.countDocuments({ ...studentFilter, status: 'approved', lastLogin: { $gte: sevenDaysAgo } }),
        User.countDocuments({
            ...studentFilter,
            status: 'approved',
            $or: [
                { lastLogin: { $lt: sevenDaysAgo } },
                { lastLogin: { $exists: false } },
                { lastLogin: null },
            ],
        }),
    ]);

    // Student IDs for filtered population
    const filteredStudentIds = await User.find(studentFilter).select('_id').lean();
    const studentObjIds = filteredStudentIds.map((s) => s._id);

    // Video watching metrics
    const lessonProgressQuery: any = { student: { $in: studentObjIds } };
    if (unit) {
        const lessonsInUnit = await Lesson.find({ unit }).select('_id').lean();
        lessonProgressQuery.lesson = { $in: lessonsInUnit.map((l) => l._id) };
    }

    const [studentsWithVideoSet, studentsWithExamSet] = await Promise.all([
        LessonProgress.distinct('student', lessonProgressQuery),
        ExamAttempt.distinct('student', { student: { $in: studentObjIds } }),
    ]);

    const studentsWithVideoCount = studentsWithVideoSet.length;
    const studentsWithExamCount = studentsWithExamSet.length;
    const noVideoStudentsCount = Math.max(0, totalStudents - studentsWithVideoCount);
    const noExamStudentsCount = Math.max(0, totalStudents - studentsWithExamCount);

    // Subscription metrics
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const [
        totalFreeStudents,
        activeFreeSubscriptions,
        expiringSoonFree,
        expiredFreeSubscriptions,
        paidSubscriptions,
        pendingPaymentsCount,
        approvedPaymentsCount,
    ] = await Promise.all([
        User.countDocuments({ ...studentFilter, isFreeStudent: true }),
        User.countDocuments({
            ...studentFilter,
            isFreeStudent: true,
            subscriptionStatus: 'active',
            subscriptionEndDate: { $gt: now },
        }),
        User.countDocuments({
            ...studentFilter,
            isFreeStudent: true,
            subscriptionStatus: 'active',
            subscriptionEndDate: { $gte: now, $lte: inThreeDays },
        }),
        User.countDocuments({
            ...studentFilter,
            isFreeStudent: true,
            $or: [{ subscriptionStatus: 'expired' }, { subscriptionEndDate: { $lt: now } }],
        }),
        User.countDocuments({
            ...studentFilter,
            isFreeStudent: false,
            subscriptionStatus: 'active',
        }),
        PaymentRequest.countDocuments({ status: 'pending' }),
        PaymentRequest.countDocuments({ status: 'approved' }),
    ]);

    // Top Watchers / Viewers (Top 5 students with most completed or highest progress)
    const topWatchersAgg = await LessonProgress.aggregate([
        { $match: { student: { $in: studentObjIds }, isCompleted: true } },
        { $group: { _id: '$student', completedCount: { $sum: 1 }, totalWatchedSeconds: { $sum: '$watchedSeconds' } } },
        { $sort: { completedCount: -1, totalWatchedSeconds: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'studentDoc',
            },
        },
        { $unwind: '$studentDoc' },
        {
            $project: {
                studentId: '$_id',
                name: '$studentDoc.name',
                phone: '$studentDoc.phone',
                grade: '$studentDoc.grade',
                completedCount: 1,
                totalWatchedSeconds: 1,
            },
        },
    ]);

    // Top Exam Scorers (Top 5 students with highest average percentage)
    const topScorersAgg = await ExamAttempt.aggregate([
        { $match: { student: { $in: studentObjIds }, status: 'submitted' } },
        {
            $group: {
                _id: '$student',
                avgPercentage: { $avg: '$percentage' },
                totalAttempts: { $sum: 1 },
                passedCount: { $sum: { $cond: ['$passed', 1, 0] } },
            },
        },
        { $match: { totalAttempts: { $gte: 1 } } },
        { $sort: { avgPercentage: -1, totalAttempts: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'studentDoc',
            },
        },
        { $unwind: '$studentDoc' },
        {
            $project: {
                studentId: '$_id',
                name: '$studentDoc.name',
                phone: '$studentDoc.phone',
                grade: '$studentDoc.grade',
                avgPercentage: { $round: ['$avgPercentage', 1] },
                totalAttempts: 1,
                passedCount: 1,
            },
        },
    ]);

    // Top Points Holders (Leaderboard)
    const topPointsHolders = await User.find(studentFilter)
        .sort({ points: -1 })
        .limit(5)
        .select('_id name phone grade points level')
        .lean();

    // Content Counts
    const lessonQuery: any = {};
    if (grade) lessonQuery.grade = grade;
    if (unit) lessonQuery.unit = unit;

    const [
        totalLessons,
        publishedLessons,
        totalQuizzes,
        weeklyExams,
        monthlyExams,
        totalBookings,
        pendingBookings,
        totalReferrals,
        rewardedReferrals,
        unresolvedAlertsCount,
    ] = await Promise.all([
        Lesson.countDocuments(lessonQuery),
        Lesson.countDocuments({ ...lessonQuery, isPublished: true }),
        Quiz.countDocuments({}),
        Exam.countDocuments(grade ? { grade, type: 'weekly' } : { type: 'weekly' }),
        Exam.countDocuments(grade ? { grade, type: 'monthly' } : { type: 'monthly' }),
        Booking.countDocuments({}),
        Booking.countDocuments({ status: 'pending' }),
        Referral.countDocuments({}),
        Referral.countDocuments({ status: 'rewarded' }),
        AdminAlert.countDocuments({ isResolved: false }),
    ]);

    // Available Units for Filter
    const availableUnits = await Lesson.distinct('unit', grade ? { grade } : {});

    // Registrations by day (last 7 days)
    const registrationsByDay = await User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // Total points aggregated
    const pointsAgg = await User.aggregate([
        { $match: studentFilter },
        { $group: { _id: null, total: { $sum: '$points' } } },
    ]);
    const totalPointsAwarded = pointsAgg[0]?.total || 0;

    return NextResponse.json({
        success: true,
        data: {
            filtersApplied: {
                grade,
                unit,
                subscriptionStatus,
                activityLevel,
                dateRange,
            },
            availableUnits,
            students: {
                total: totalStudents,
                active: approvedStudents,
                pending: pendingStudents,
                suspended: suspendedStudents,
                rejected: rejectedStudents,
                activeByActivity: activeByLogin,
                inactiveByActivity: inactiveByLogin,
                studentsWithVideo: studentsWithVideoCount,
                noVideoStudents: noVideoStudentsCount,
                studentsWithExam: studentsWithExamCount,
                noExamStudents: noExamStudentsCount,
            },
            subscriptions: {
                totalFree: totalFreeStudents,
                activeFree: activeFreeSubscriptions,
                expiringSoonFree,
                expiredFree: expiredFreeSubscriptions,
                paid: paidSubscriptions,
                pendingPayments: pendingPaymentsCount,
                approvedPayments: approvedPaymentsCount,
                freeSlotsFilled: freeOfferStats.freeStudentsCount,
                freeSlotRemaining: freeOfferStats.remainingSlots,
                freeLimit: freeOfferStats.freeStudentsLimit,
                usagePercentage: freeOfferStats.usagePercentage,
                freeOfferEnabled: freeOfferStats.freeOfferEnabled,
                isLimitExceeded: freeOfferStats.isLimitExceeded,
            },
            leaderboards: {
                topWatchers: topWatchersAgg,
                topScorers: topScorersAgg,
                topPoints: topPointsHolders,
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
            gamification: {
                totalPointsAwarded,
            },
            charts: {
                registrationsByDay,
            },
            alertsSummary: {
                unresolvedCount: unresolvedAlertsCount,
            },
        },
    });
}

export const GET = withAdmin(handler);
