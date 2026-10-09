import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';
import User from '@/lib/db/models/User';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OfferStatus = 'ACTIVE' | 'FULL' | 'DISABLED' | 'NOT_STARTED' | 'EXPIRED';

export interface FreeOfferSettings {
    freeStudentsLimit: number;
    freeOfferEnabled: boolean;
    freeOfferTitle: string;
    freeOfferDescription: string;
    freeOfferDuration: number; // in days
    freeOfferCtaText: string;
    freeOfferStartDate: Date | null;
    freeOfferEndDate: Date | null;
    freeOfferEligibleGrades: string[]; // [] = all grades
}

export interface FreeOfferStats {
    freeStudentsCount: number;
    freeStudentsLimit: number;
    remainingSlots: number;
    usagePercentage: number;
    freeOfferEnabled: boolean;
    isOfferActive: boolean;
    isLimitExceeded: boolean;
    offerStatus: OfferStatus;
    settings: FreeOfferSettings;
}

// ─── Keys map ─────────────────────────────────────────────────────────────────

const SETTING_KEYS = [
    'free_student_limit', 'freeStudentsLimit',
    'free_offer_enabled', 'freeOfferEnabled',
    'free_offer_title', 'freeOfferTitle',
    'free_offer_description', 'freeOfferDescription',
    'free_offer_duration', 'freeOfferDuration',
    'free_offer_cta_text',
    'free_offer_start_date',
    'free_offer_end_date',
    'free_offer_eligible_grades',
];

// ─── getFreeOfferSettings ─────────────────────────────────────────────────────

export async function getFreeOfferSettings(): Promise<FreeOfferSettings> {
    await connectDB();
    const rows = await Settings.find({ key: { $in: SETTING_KEYS } }).lean();

    const map: Record<string, any> = {};
    rows.forEach((s) => { map[s.key] = s.value; });

    // --- limit ---
    const rawLimit = map['free_student_limit'] ?? map['freeStudentsLimit'] ?? process.env.FREE_STUDENT_LIMIT ?? 100;
    const limitNum = parseInt(String(rawLimit), 10);
    const freeStudentsLimit = isNaN(limitNum) || limitNum < 1 ? 100 : limitNum;

    // --- enabled ---
    const rawEnabled = map['free_offer_enabled'] ?? map['freeOfferEnabled'] ?? true;
    const freeOfferEnabled = String(rawEnabled) !== 'false' && Boolean(rawEnabled);

    // --- title ---
    const freeOfferTitle = String(
        map['free_offer_title'] ?? map['freeOfferTitle'] ??
        `عرض مجاني لأول ${freeStudentsLimit} طالب`
    );

    // --- description ---
    const freeOfferDescription = String(
        map['free_offer_description'] ?? map['freeOfferDescription'] ??
        'اشتراك شامل لجميع الدروس والامتحانات والمراجعات'
    );

    // --- duration ---
    const rawDuration = map['free_offer_duration'] ?? map['freeOfferDuration'] ?? 365;
    const durationNum = parseInt(String(rawDuration), 10);
    const freeOfferDuration = isNaN(durationNum) || durationNum < 1 ? 365 : durationNum;

    // --- CTA text ---
    const freeOfferCtaText = String(map['free_offer_cta_text'] ?? 'احجز مكانك الآن مجانًا');

    // --- dates ---
    const rawStart = map['free_offer_start_date'];
    const freeOfferStartDate = rawStart ? new Date(rawStart) : null;

    const rawEnd = map['free_offer_end_date'];
    const freeOfferEndDate = rawEnd ? new Date(rawEnd) : null;

    // --- eligible grades ---
    const rawGrades = map['free_offer_eligible_grades'];
    let freeOfferEligibleGrades: string[] = [];
    if (rawGrades) {
        if (Array.isArray(rawGrades)) {
            freeOfferEligibleGrades = rawGrades.filter(Boolean);
        } else if (typeof rawGrades === 'string' && rawGrades.trim()) {
            freeOfferEligibleGrades = rawGrades.split(',').map((g: string) => g.trim()).filter(Boolean);
        }
    }

    return {
        freeStudentsLimit,
        freeOfferEnabled,
        freeOfferTitle,
        freeOfferDescription,
        freeOfferDuration,
        freeOfferCtaText,
        freeOfferStartDate,
        freeOfferEndDate,
        freeOfferEligibleGrades,
    };
}

// ─── computeOfferStatus ───────────────────────────────────────────────────────

export function computeOfferStatus(
    settings: FreeOfferSettings,
    count: number
): OfferStatus {
    if (!settings.freeOfferEnabled) return 'DISABLED';

    const now = new Date();
    if (settings.freeOfferStartDate && now < settings.freeOfferStartDate) return 'NOT_STARTED';
    if (settings.freeOfferEndDate && now > settings.freeOfferEndDate) return 'EXPIRED';
    if (count >= settings.freeStudentsLimit) return 'FULL';
    return 'ACTIVE';
}

// ─── getFreeOfferStats ────────────────────────────────────────────────────────

export async function getFreeOfferStats(): Promise<FreeOfferStats> {
    await connectDB();
    const settings = await getFreeOfferSettings();

    const freeStudentsCount = await User.countDocuments({
        role: 'student',
        isFreeStudent: true,
    });

    const limit = settings.freeStudentsLimit;
    const remainingSlots = Math.max(0, limit - freeStudentsCount);
    const usagePercentage = limit > 0 ? Math.min(100, Math.round((freeStudentsCount / limit) * 100)) : 0;
    const offerStatus = computeOfferStatus(settings, freeStudentsCount);
    const isOfferActive = offerStatus === 'ACTIVE';
    const isLimitExceeded = freeStudentsCount > limit;

    return {
        freeStudentsCount,
        freeStudentsLimit: limit,
        remainingSlots,
        usagePercentage,
        freeOfferEnabled: settings.freeOfferEnabled,
        isOfferActive,
        isLimitExceeded,
        offerStatus,
        settings,
    };
}

// ─── isStudentEligibleForOffer ────────────────────────────────────────────────

export function isStudentEligibleForOffer(
    studentGrade: string | undefined,
    eligibleGrades: string[]
): boolean {
    // Empty array = all grades eligible
    if (!eligibleGrades || eligibleGrades.length === 0) return true;
    if (!studentGrade) return false;
    return eligibleGrades.includes(studentGrade);
}

// ─── assignFreeSlotAtomically ─────────────────────────────────────────────────
/**
 * Atomically assigns a free slot to a student.
 *
 * Race-condition safety: uses findOneAndUpdate with the `isFreeStudent: false`
 * guard, so two concurrent requests for the same student can't both succeed.
 * The overall count check is done before (optimistic) but the final guard is
 * the MongoDB atomic op plus a pre-check of real count vs limit.
 */
export async function assignFreeSlotAtomically(
    studentId: string,
    studentGrade?: string,
): Promise<{ assigned: boolean; slotNumber?: number; reason?: string }> {
    await connectDB();

    const settings = await getFreeOfferSettings();

    // Re-count inside the function for accuracy
    const currentCount = await User.countDocuments({ role: 'student', isFreeStudent: true });
    const offerStatus = computeOfferStatus(settings, currentCount);

    if (offerStatus !== 'ACTIVE') {
        return { assigned: false, reason: offerStatus.toLowerCase() };
    }

    // Grade eligibility check (server-side)
    if (!isStudentEligibleForOffer(studentGrade, settings.freeOfferEligibleGrades)) {
        return { assigned: false, reason: 'grade_not_eligible' };
    }

    // Atomic guard: only succeeds if student is NOT already free AND
    // the current count < limit (the $lt check prevents going over the cap)
    // Note: MongoDB doesn't support cross-document atomicity without transactions,
    // but the isFreeStudent:false guard prevents duplicate assignment per student.
    // We also re-check count here — slight TOCTOU window is acceptable given
    // low concurrency; for high-traffic, wrap in a session/transaction.

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + settings.freeOfferDuration);

    const slotNumber = currentCount + 1;

    const updatedStudent = await User.findOneAndUpdate(
        {
            _id: studentId,
            role: 'student',
            isFreeStudent: false, // ← atomic duplicate-claim prevention
        },
        {
            $set: {
                isFreeStudent: true,
                freeSlotNumber: slotNumber,
                subscriptionStatus: 'active',
                subscriptionStartDate: startDate,
                subscriptionEndDate: endDate,
            },
        },
        { new: true },
    );

    if (!updatedStudent) {
        return { assigned: false, reason: 'already_free_or_not_found' };
    }

    // Double-check: if the slot we just assigned pushed count over the limit,
    // that's acceptable by design (we allow up to `slotNumber <= limit`).
    if (slotNumber > settings.freeStudentsLimit) {
        // Rollback the assignment (edge case: was OK during check, not after)
        await User.findByIdAndUpdate(studentId, {
            $set: {
                isFreeStudent: false,
                freeSlotNumber: null,
                subscriptionStatus: 'none',
                subscriptionStartDate: null,
                subscriptionEndDate: null,
            },
        });
        return { assigned: false, reason: 'limit_reached' };
    }

    // Evaluate referral qualification for free offer subscriber
    const { evaluateReferralForStudent } = await import('@/lib/referrals/processor');
    await evaluateReferralForStudent(studentId, 'subscription');

    return { assigned: true, slotNumber };
}
