import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Reward from '@/lib/db/models/Reward';
import { withStudent } from '@/lib/auth/middleware';

// GET /api/student/rewards - get all active rewards
async function getHandler(): Promise<NextResponse> {
    await connectDB();

    const rewards = await Reward.find({ isActive: true })
        .select('name description requiredPoints quantity redeemedCount image category')
        .sort({ requiredPoints: 1 })
        .lean();

    const rewardsWithAvailability = rewards.map((r) => ({
        ...r,
        available: r.quantity === -1 || r.redeemedCount < r.quantity,
    }));

    return NextResponse.json({ success: true, data: { rewards: rewardsWithAvailability } });
}

export const GET = withStudent(getHandler);
