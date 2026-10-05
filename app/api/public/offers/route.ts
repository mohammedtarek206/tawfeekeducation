import { NextResponse } from 'next/server';
import { getFreeOfferStats, getFreeOfferSettings } from '@/lib/settings/freeOffer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/public/offers
 * يُرجع العروض النشطة فقط — بيانات آمنة للعرض العام
 */
export async function GET() {
    try {
        const [stats, settings] = await Promise.all([
            getFreeOfferStats(),
            getFreeOfferSettings(),
        ]);

        // إذا كان العرض معطلاً من الأدمن لا نعرضه
        if (!settings.freeOfferEnabled) {
            return NextResponse.json({ success: true, offers: [] });
        }

        const claimed = stats.freeStudentsCount;
        const maximum = stats.freeStudentsLimit;
        const remaining = Math.max(0, maximum - claimed);
        const percentage = maximum > 0 ? Math.min(100, Math.round((claimed / maximum) * 100)) : 0;
        const isFull = claimed >= maximum;

        const offer = {
            id: 'free-students-offer',
            type: 'FREE_FIRST_N' as const,
            title: settings.freeOfferTitle,
            description: settings.freeOfferDescription,
            maximumStudents: maximum,
            claimedStudents: claimed,
            remainingStudents: remaining,
            percentage,
            isFull,
            isActive: !isFull,
            durationInDays: settings.freeOfferDuration,
            cta: isFull ? 'اكتمل العرض' : 'احجز مكانك الآن',
        };

        return NextResponse.json({ success: true, offers: [offer] });
    } catch (error) {
        console.error('[/api/public/offers] Error:', error);
        return NextResponse.json({ success: false, offers: [] }, { status: 500 });
    }
}
