import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';
import User from '@/lib/db/models/User';

export interface FreeOfferSettings {
    freeStudentsLimit: number;
    freeOfferEnabled: boolean;
    freeOfferTitle: string;
    freeOfferDescription: string;
    freeOfferDuration: number;
}

export interface FreeOfferStats {
    freeStudentsCount: number;
    freeStudentsLimit: number;
    remainingSlots: number;
    usagePercentage: number;
    freeOfferEnabled: boolean;
    isOfferActive: boolean;
    isLimitExceeded: boolean;
}

export async function getFreeOfferSettings(): Promise<FreeOfferSettings> {
    await connectDB();
    const settings = await Settings.find({
        key: {
            $in: [
                'free_student_limit',
                'freeStudentsLimit',
                'free_offer_enabled',
                'freeOfferEnabled',
                'free_offer_title',
                'freeOfferTitle',
                'free_offer_description',
                'freeOfferDescription',
                'free_offer_duration',
                'freeOfferDuration'
            ]
        }
    }).lean();

    const map: Record<string, any> = {};
    settings.forEach((s) => {
        map[s.key] = s.value;
    });

    const rawLimit = map['free_student_limit'] ?? map['freeStudentsLimit'] ?? process.env.FREE_STUDENT_LIMIT ?? 100;
    const limitNum = parseInt(String(rawLimit), 10);
    const freeStudentsLimit = isNaN(limitNum) || limitNum < 1 ? 100 : limitNum;

    const rawEnabled = map['free_offer_enabled'] ?? map['freeOfferEnabled'] ?? true;
    const freeOfferEnabled = String(rawEnabled) !== 'false' && Boolean(rawEnabled);

    const freeOfferTitle = String(map['free_offer_title'] ?? map['freeOfferTitle'] ?? `عرض مجاني لأول ${freeStudentsLimit} طالب`);
    const freeOfferDescription = String(map['free_offer_description'] ?? map['freeOfferDescription'] ?? 'اشتراك شامل لجميع الدروس والامتحانات والمراجعات');

    const rawDuration = map['free_offer_duration'] ?? map['freeOfferDuration'] ?? 365;
    const durationNum = parseInt(String(rawDuration), 10);
    const freeOfferDuration = isNaN(durationNum) || durationNum < 1 ? 365 : durationNum;

    return {
        freeStudentsLimit,
        freeOfferEnabled,
        freeOfferTitle,
        freeOfferDescription,
        freeOfferDuration
    };
}

export async function getFreeOfferStats(): Promise<FreeOfferStats> {
    await connectDB();
    const settings = await getFreeOfferSettings();

    const freeStudentsCount = await User.countDocuments({
        role: 'student',
        isFreeStudent: true
    });

    const limit = settings.freeStudentsLimit;
    const remainingSlots = Math.max(0, limit - freeStudentsCount);
    const usagePercentage = limit > 0 ? Math.min(100, Math.round((freeStudentsCount / limit) * 100)) : 0;
    const isOfferActive = settings.freeOfferEnabled && freeStudentsCount < limit;
    const isLimitExceeded = freeStudentsCount > limit;

    return {
        freeStudentsCount,
        freeStudentsLimit: limit,
        remainingSlots,
        usagePercentage,
        freeOfferEnabled: settings.freeOfferEnabled,
        isOfferActive,
        isLimitExceeded
    };
}

export async function assignFreeSlotAtomically(studentId: string): Promise<{ assigned: boolean; slotNumber?: number; reason?: string }> {
    await connectDB();
    const stats = await getFreeOfferStats();

    if (!stats.isOfferActive) {
        return {
            assigned: false,
            reason: !stats.freeOfferEnabled ? 'offer_disabled' : 'limit_reached'
        };
    }

    const nextSlotNumber = stats.freeStudentsCount + 1;
    const settings = await getFreeOfferSettings();

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + settings.freeOfferDuration);

    const updatedStudent = await User.findOneAndUpdate(
        {
            _id: studentId,
            role: 'student',
            isFreeStudent: false
        },
        {
            $set: {
                isFreeStudent: true,
                freeSlotNumber: nextSlotNumber,
                subscriptionStatus: 'active',
                subscriptionStartDate: startDate,
                subscriptionEndDate: endDate
            }
        },
        { new: true }
    );

    if (!updatedStudent) {
        return { assigned: false, reason: 'already_free_or_not_found' };
    }

    return {
        assigned: true,
        slotNumber: nextSlotNumber
    };
}
