import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Subscription from '@/lib/db/models/Subscription';

export type AccessReason =
    | 'content_is_free'
    | 'active_subscription'
    | 'pending_approval'
    | 'subscription_expired'
    | 'no_subscription'
    | 'suspended'
    | 'rejected'
    | 'user_not_found'
    | 'role_allowed';

export interface AccessCheckResult {
    canAccess: boolean;
    reason: AccessReason;
    user?: any;
    subscription?: any;
}

/**
 * Server-side check for student content access.
 * Checks account approval status, active subscription records, expiration date, and grade.
 */
export async function checkStudentAccess(
    studentId: string,
    options: { grade?: string; isFreeContent?: boolean } = {}
): Promise<AccessCheckResult> {
    await connectDB();

    // 1. Fetch student user
    const user = await User.findById(studentId).lean() as any;
    if (!user) {
        return { canAccess: false, reason: 'user_not_found' };
    }

    // Admins and parents bypass student subscription checks
    if (user.role === 'admin' || user.role === 'parent') {
        return { canAccess: true, reason: 'role_allowed', user };
    }

    // Account status checks
    if (user.status === 'pending') {
        return { canAccess: false, reason: 'pending_approval', user };
    }
    if (user.status === 'rejected') {
        return { canAccess: false, reason: 'rejected', user };
    }
    if (user.status === 'suspended') {
        return { canAccess: false, reason: 'suspended', user };
    }

    // Free content check
    if (options.isFreeContent) {
        return { canAccess: true, reason: 'content_is_free', user };
    }

    const now = new Date();

    // Query active real Subscription records in MongoDB
    const query: any = {
        studentId: user._id,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
    };

    if (options.grade) {
        const studentGrade = options.grade;
        const matchingGrades = (studentGrade === 'second_secondary' || studentGrade === 'second_secondary_baccalaureate')
            ? ['second_secondary', 'second_secondary_baccalaureate', 'all', '', null]
            : [studentGrade, 'all', '', null];
        query.$or = [{ gradeId: { $in: matchingGrades } }, { gradeId: { $exists: false } }];
    }

    const activeSubscription = await Subscription.findOne(query)
        .populate('planId')
        .sort({ endDate: -1 })
        .lean();

    if (activeSubscription) {
        return { canAccess: true, reason: 'active_subscription', user, subscription: activeSubscription };
    }

    // Check legacy / sync User fields as fallback if valid and not expired
    if (
        user.subscriptionStatus === 'active' &&
        user.subscriptionEndDate &&
        new Date(user.subscriptionEndDate) >= now
    ) {
        return { canAccess: true, reason: 'active_subscription', user };
    }

    // Check if subscription was previously active or free but is now expired
    const isExpiredOnUser = Boolean(user.subscriptionEndDate && new Date(user.subscriptionEndDate) < now);
    const hasExpiredSubscription = await Subscription.findOne({
        studentId: user._id,
        endDate: { $lt: now },
    }).lean();

    if (isExpiredOnUser || hasExpiredSubscription || user.subscriptionStatus === 'expired') {
        // Self-heal: sync user status to 'expired' if end date has passed
        if (user.subscriptionStatus === 'active' || (user.isFreeStudent && isExpiredOnUser)) {
            await User.findByIdAndUpdate(user._id, {
                $set: { subscriptionStatus: 'expired' },
            }).catch(() => {});
        }
        return { canAccess: false, reason: 'subscription_expired', user };
    }

    return { canAccess: false, reason: 'no_subscription', user };
}

/**
 * Returns all subscriptions for a given student (active, expired, pending, etc.)
 */
export async function getStudentSubscriptions(studentId: string) {
    await connectDB();
    const now = new Date();

    // Update any active subscriptions that have passed their endDate to 'expired'
    await Subscription.updateMany(
        { studentId, status: 'active', endDate: { $lt: now } },
        { $set: { status: 'expired' } }
    );

    const subscriptions = await Subscription.find({ studentId })
        .populate('planId')
        .populate('paymentRequestId')
        .sort({ createdAt: -1 })
        .lean();

    return subscriptions;
}
