import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import { withAdmin } from '@/lib/auth/middleware';

// GET /api/admin/subscriptions/requests
async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const total = await PaymentRequest.countDocuments(filter);
    const requests = await PaymentRequest.find(filter)
        .populate('studentId', 'name phone grade')
        .populate('planId', 'name type')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return NextResponse.json({
        success: true,
        data: { requests, total, page, pages: Math.ceil(total / limit) },
    });
}

export const GET = withAdmin(getHandler);
