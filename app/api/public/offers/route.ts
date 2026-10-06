import { NextResponse } from 'next/server';
import { getFreeOfferStats } from '@/lib/settings/freeOffer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/public/offers
 * Returns public-safe offer data only — no admin/sensitive fields.
 */
export async function GET() {
    try {
        const stats = await getFreeOfferStats();

        // Offer is disabled or not started or expired — return empty
        if (stats.offerStatus === 'DISABLED') {
            return NextResponse.json({ success: true, offers: [] });
        }

        const claimed = stats.freeStudentsCount;
        const maximum = stats.freeStudentsLimit;
        const remaining = Math.max(0, maximum - claimed);
        const percentage = maximum > 0 ? Math.min(100, Math.round((claimed / maximum) * 100)) : 0;
        const isFull = stats.offerStatus === 'FULL';
        const s = stats.settings;

        const offer = {
            id: 'free-students-offer',
            type: 'FREE_FIRST_N' as const,
            title: s.freeOfferTitle,
            description: s.freeOfferDescription,
            maximumStudents: maximum,
            claimedStudents: claimed,
            remainingStudents: remaining,
            percentage,
            isFull,
            isActive: stats.isOfferActive,
            offerStatus: stats.offerStatus,
            durationInDays: s.freeOfferDuration,
            cta: s.freeOfferCtaText,
            startDate: s.freeOfferStartDate?.toISOString() ?? null,
            endDate: s.freeOfferEndDate?.toISOString() ?? null,
            eligibleGrades: s.freeOfferEligibleGrades,
        };

        return NextResponse.json({ success: true, offers: [offer] });
    } catch (error) {
        console.error('[/api/public/offers] Error:', error);
        return NextResponse.json({ success: false, offers: [] }, { status: 500 });
    }
}
