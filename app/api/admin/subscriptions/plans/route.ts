import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import { withAdmin } from '@/lib/auth/middleware';
import { subscriptionPlanSchema } from '@/lib/validation/schemas';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/admin/subscriptions/plans
async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({
        success: true,
        data: { plans },
    });
}

// POST /api/admin/subscriptions/plans
async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const parsed = subscriptionPlanSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const plan = await SubscriptionPlan.create(parsed.data);

    return NextResponse.json(
        { success: true, message: 'تم إنشاء الباقة بنجاح', data: { plan } },
        { status: 201 }
    );
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
