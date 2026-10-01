import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SubscriptionPlan from '@/lib/db/models/SubscriptionPlan';
import { withAdmin } from '@/lib/auth/middleware';
import { subscriptionPlanSchema } from '@/lib/validation/schemas';

interface RouteContext {
    params: { id: string };
}

// PUT /api/admin/subscriptions/plans/[id]
async function putHandler(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
    await connectDB();
    const { id } = ctx.params;
    const body = await req.json();

    const parsed = subscriptionPlanSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!plan) {
        return NextResponse.json({ success: false, message: 'الباقة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم التحديث بنجاح', data: { plan } });
}

// DELETE /api/admin/subscriptions/plans/[id]
async function deleteHandler(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
    await connectDB();
    const { id } = ctx.params;

    const plan = await SubscriptionPlan.findByIdAndDelete(id);
    if (!plan) {
        return NextResponse.json({ success: false, message: 'الباقة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم الحذف بنجاح' });
}

export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
