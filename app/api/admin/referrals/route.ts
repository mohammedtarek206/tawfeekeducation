import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Referral from '@/lib/db/models/Referral';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { getReferralSettings } from '@/lib/referrals/processor';

async function handler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const settings = await getReferralSettings();

    // Stats
    const totalReferrals = await Referral.countDocuments();
    const pendingReferrals = await Referral.countDocuments({ status: 'pending' });
    const approvedReferrals = await Referral.countDocuments({ status: { $in: ['approved', 'verified'] } });
    const rewardedReferrals = await Referral.countDocuments({ status: 'rewarded' });
    const totalPointsAwardedDocs = await Referral.aggregate([
        { $match: { pointsAwarded: true } },
        { $group: { _id: null, total: { $sum: '$pointsAmount' } } }
    ]);
    const totalPointsAwarded = totalPointsAwardedDocs[0]?.total || 0;

    // Filter query
    const filter: Record<string, any> = {};
    if (statusFilter && statusFilter !== 'all') {
        filter.status = statusFilter;
    }

    const referrals = await Referral.find(filter)
        .populate('referrer', 'name phone grade')
        .populate('referred', 'name phone grade status subscriptionStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    // Top Referrers
    const topReferrersGroup = await Referral.aggregate([
        { $match: { status: 'rewarded' } },
        { $group: { _id: '$referrer', count: { $sum: 1 }, points: { $sum: '$pointsAmount' } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    const topReferrerUserIds = topReferrersGroup.map(g => g._id);
    const topReferrerUsers = await User.find({ _id: { $in: topReferrerUserIds } })
        .select('name phone grade referralCode points')
        .lean();

    const topReferrers = topReferrersGroup.map(g => {
        const u = topReferrerUsers.find(user => (user as any)._id.toString() === g._id.toString()) || {};
        return {
            userId: g._id,
            name: (u as any).name || 'طالب',
            phone: (u as any).phone || '',
            grade: (u as any).grade || '',
            referralCode: (u as any).referralCode || '',
            successfulReferrals: g.count,
            pointsEarnedFromReferrals: g.points,
            totalPoints: (u as any).points || 0,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            settings,
            stats: {
                total: totalReferrals,
                pending: pendingReferrals,
                approved: approvedReferrals,
                rewarded: rewardedReferrals,
                totalPointsAwarded,
            },
            topReferrers,
            referrals,
        },
    });
}

export const GET = withAdmin(handler);
