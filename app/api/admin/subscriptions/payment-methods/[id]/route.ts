import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentMethod from '@/lib/db/models/PaymentMethod';
import { withAdmin } from '@/lib/auth/middleware';
import { paymentMethodSchema } from '@/lib/validation/schemas';

interface RouteContext {
    params: { id: string };
}

// PUT /api/admin/subscriptions/payment-methods/[id]
async function putHandler(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
    await connectDB();
    const { id } = ctx.params;
    const body = await req.json();

    const parsed = paymentMethodSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const paymentMethod = await PaymentMethod.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!paymentMethod) {
        return NextResponse.json({ success: false, message: 'طريقة الدفع غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم التحديث بنجاح', data: { paymentMethod } });
}

// DELETE /api/admin/subscriptions/payment-methods/[id]
async function deleteHandler(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
    await connectDB();
    const { id } = ctx.params;

    const paymentMethod = await PaymentMethod.findByIdAndDelete(id);
    if (!paymentMethod) {
        return NextResponse.json({ success: false, message: 'طريقة الدفع غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم الحذف بنجاح' });
}

export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
