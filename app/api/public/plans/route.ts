import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import { getFreeOfferStats, getFreeOfferSettings } from '@/lib/settings/freeOffer';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectDB();

        const freeStats = await getFreeOfferStats();
        const freeSettings = await getFreeOfferSettings();

        // Fetch all active plans
        const plans = await SubscriptionPlan.find({ active: true }).sort({ grade: 1, price: 1 }).lean();

        return NextResponse.json({
            success: true,
            data: {
                plans,
                freeStats,
                freeSettings
            }
        });
    } catch (error) {
        console.error('Error fetching public plans:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء جلب الباقات' }, { status: 500 });
    }
}
