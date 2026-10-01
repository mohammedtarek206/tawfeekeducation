import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { getFreeOfferStats } from '@/lib/settings/freeOffer';

export const revalidate = 0;

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';
    const grade = searchParams.get('grade')?.trim() || '';

    const stats = await getFreeOfferStats();

    const query: any = {
        role: 'student',
        isFreeStudent: true
    };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    if (grade) {
        query.grade = grade;
    }

    const freeStudents = await User.find(query)
        .select('_id name phone grade freeSlotNumber subscriptionStatus subscriptionStartDate subscriptionEndDate createdAt')
        .sort({ freeSlotNumber: 1, createdAt: -1 })
        .lean();

    return NextResponse.json({
        success: true,
        data: {
            stats,
            totalFreeStudents: freeStudents.length,
            students: freeStudents
        }
    });
}

export const GET = withAdmin(getHandler);
