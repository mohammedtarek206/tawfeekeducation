import { NextResponse } from 'next/server';
import { getFreeOfferStats, getFreeOfferSettings } from '@/lib/settings/freeOffer';

export const revalidate = 0; // Dynamic route

export async function GET(): Promise<NextResponse> {
    try {
        const stats = await getFreeOfferStats();
        const settings = await getFreeOfferSettings();

        return NextResponse.json({
            success: true,
            data: {
                freeSlotsFilled: stats.freeStudentsCount,
                freeLimit: stats.freeStudentsLimit,
                freeSlotRemaining: stats.remainingSlots,
                usagePercentage: stats.usagePercentage,
                freeOfferEnabled: stats.freeOfferEnabled,
                isOfferActive: stats.isOfferActive,
                isLimitExceeded: stats.isLimitExceeded,
                title: settings.freeOfferTitle,
                description: settings.freeOfferDescription,
                duration: settings.freeOfferDuration,
            },
        });
    } catch (error) {
        console.error('Free stats GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ في تقديم بيانات العرض المجاني' }, { status: 500 });
    }
}
