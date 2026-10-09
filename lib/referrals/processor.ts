import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';
import User from '@/lib/db/models/User';
import Referral from '@/lib/db/models/Referral';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import StudentAchievement from '@/lib/db/models/StudentAchievement';
import Achievement from '@/lib/db/models/Achievement';
import { awardPoints } from '@/lib/gamification/engine';
import { generateReferralCode } from '@/lib/utils/helpers';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

export interface ReferralSettings {
    referralEnabled: boolean;
    referralPoints: number;
    referralQualificationRule: 'on_approval' | 'on_active_subscription' | 'on_first_payment';
    referralFreeOfferQualifies: boolean;
}

export async function getReferralSettings(): Promise<ReferralSettings> {
    await connectDB();
    const rows = await Settings.find({
        key: {
            $in: [
                'referral_enabled', 'referralEnabled',
                'referral_points', 'referralPoints',
                'referral_qualification_rule', 'referralQualificationRule',
                'referral_free_offer_qualifies', 'referralFreeOfferQualifies',
            ]
        }
    }).lean();

    const map: Record<string, any> = {};
    rows.forEach((s) => { map[s.key] = s.value; });

    const rawEnabled = map['referral_enabled'] ?? map['referralEnabled'] ?? true;
    const referralEnabled = String(rawEnabled) !== 'false' && Boolean(rawEnabled);

    const rawPoints = map['referral_points'] ?? map['referralPoints'] ?? process.env.DEFAULT_REFERRAL_POINTS ?? 50;
    const pointsNum = parseInt(String(rawPoints), 10);
    const referralPoints = isNaN(pointsNum) || pointsNum < 0 ? 50 : pointsNum;

    const rawRule = String(map['referral_qualification_rule'] ?? map['referralQualificationRule'] ?? 'on_approval');
    const referralQualificationRule: 'on_approval' | 'on_active_subscription' | 'on_first_payment' =
        ['on_approval', 'on_active_subscription', 'on_first_payment'].includes(rawRule)
            ? (rawRule as any)
            : 'on_approval';

    const rawFreeQual = map['referral_free_offer_qualifies'] ?? map['referralFreeOfferQualifies'] ?? true;
    const referralFreeOfferQualifies = String(rawFreeQual) !== 'false' && Boolean(rawFreeQual);

    return {
        referralEnabled,
        referralPoints,
        referralQualificationRule,
        referralFreeOfferQualifies,
    };
}

export async function ensureUserReferralCode(user: any): Promise<string> {
    if (user.referralCode && user.referralCode.trim()) {
        return user.referralCode;
    }
    await connectDB();
    let code = generateReferralCode(user.name || 'STUDENT');
    let exists = await User.findOne({ referralCode: code });
    let attempts = 0;
    while (exists && attempts < 10) {
        code = generateReferralCode(user.name || 'STUDENT');
        exists = await User.findOne({ referralCode: code });
        attempts++;
    }
    await User.findByIdAndUpdate(user._id || user.id, { referralCode: code });
    return code;
}

export async function evaluateReferralForStudent(
    studentId: string,
    event: 'approval' | 'subscription' | 'payment',
    adminId?: string
): Promise<{ rewarded: boolean; pointsAwarded?: number; reason?: string }> {
    await connectDB();

    const referral = await Referral.findOne({ referred: studentId });
    if (!referral) {
        return { rewarded: false, reason: 'no_referral_found' };
    }

    if (referral.pointsAwarded || referral.status === 'rewarded') {
        return { rewarded: false, reason: 'already_rewarded' };
    }

    const settings = await getReferralSettings();
    if (!settings.referralEnabled) {
        return { rewarded: false, reason: 'referral_disabled' };
    }

    const referredUser = await User.findById(studentId).select('status subscriptionStatus isFreeStudent name phone');
    if (!referredUser) {
        return { rewarded: false, reason: 'student_not_found' };
    }

    // Check if qualified based on configured rule
    let isQualified = false;
    const rule = settings.referralQualificationRule;

    if (rule === 'on_approval') {
        isQualified = event === 'approval' || referredUser.status === 'approved';
    } else if (rule === 'on_active_subscription') {
        const hasSub = referredUser.subscriptionStatus === 'active';
        const hasFree = referredUser.isFreeStudent && settings.referralFreeOfferQualifies;
        isQualified = event === 'subscription' || hasSub || hasFree;
    } else if (rule === 'on_first_payment') {
        if (event === 'payment') {
            isQualified = true;
        } else {
            const hasApprovedPayment = await PaymentRequest.exists({ studentId, status: 'approved' });
            isQualified = Boolean(hasApprovedPayment);
        }
    }

    if (!isQualified) {
        // Update referral status to approved or qualified if not yet rewarded
        if (referredUser.status === 'approved' && referral.status === 'pending') {
            await Referral.findByIdAndUpdate(referral._id, { status: 'approved', approvedAt: new Date() });
        }
        return { rewarded: false, reason: 'qualification_criteria_not_met' };
    }

    // ATOMIC IDEMPOTENT REWARD GUARD
    const updatedReferral = await Referral.findOneAndUpdate(
        {
            _id: referral._id,
            pointsAwarded: false,
            status: { $ne: 'rewarded' }
        },
        {
            $set: {
                status: 'rewarded',
                pointsAwarded: true,
                pointsAmount: settings.referralPoints,
                qualifiedAt: new Date(),
                rewardedAt: new Date(),
                approvedAt: referral.approvedAt || new Date(),
            }
        },
        { new: true }
    );

    if (!updatedReferral) {
        return { rewarded: false, reason: 'already_rewarded_concurrently' };
    }

    // Award points to referrer
    const pointsRes = await awardPoints({
        studentId: referral.referrer.toString(),
        amount: settings.referralPoints,
        type: 'referral',
        reason: `مكافأة دعوة الطالب (${referredUser.name || 'صديق جديد'})`,
        referenceId: referral._id,
        referenceType: 'Referral',
        awardedBy: adminId,
    });

    if (adminId) {
        await createAuditLog({
            actor: adminId,
            actorRole: 'admin',
            action: AUDIT_ACTIONS.REFERRAL_REWARDED,
            target: referral.referrer.toString(),
            targetModel: 'User',
            metadata: { referredStudent: studentId, points: settings.referralPoints },
        });
    }

    // Check referral achievements for referrer
    await checkReferralAchievements(referral.referrer.toString());

    return { rewarded: true, pointsAwarded: settings.referralPoints };
}

export async function checkReferralAchievements(referrerId: string): Promise<void> {
    try {
        await connectDB();
        const successfulReferralsCount = await Referral.countDocuments({
            referrer: referrerId,
            pointsAwarded: true,
        });

        // Find relevant achievements (category or title containing referral / دعوة)
        const achievements = await Achievement.find({
            $or: [
                { category: 'referral' },
                { title: { $regex: /دعوة|إحالة|أصدقاء/, $options: 'i' } }
            ]
        });

        for (const ach of achievements) {
            let targetCount = ach.targetCount || 1;
            // Parse target from condition if specified
            if (ach.condition?.type === 'referral_count' && ach.condition.target) {
                targetCount = ach.condition.target;
            }

            if (successfulReferralsCount >= targetCount) {
                // Try atomic insertion of StudentAchievement to prevent duplicate claim
                try {
                    const studentAch = await StudentAchievement.create({
                        student: referrerId,
                        achievement: ach._id,
                        unlockedAt: new Date(),
                        pointsEarned: ach.pointsReward || 0,
                    });

                    if (ach.pointsReward && ach.pointsReward > 0) {
                        await awardPoints({
                            studentId: referrerId,
                            amount: ach.pointsReward,
                            type: 'achievement',
                            reason: `مكافأة وسام: ${ach.title}`,
                            referenceId: studentAch._id,
                            referenceType: 'StudentAchievement',
                        });
                    }
                } catch (e: any) {
                    // Duplicate key error (11000) means already unlocked — ignore safely
                }
            }
        }
    } catch (err) {
        console.error('Check referral achievements error:', err);
    }
}
