import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentMethod from '@/lib/db/models/PaymentMethod';
import { withAdmin } from '@/lib/auth/middleware';
import { paymentMethodSchema } from '@/lib/validation/schemas';

// GET /api/admin/subscriptions/payment-methods
async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const paymentMethods = await PaymentMethod.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({
        success: true,
        data: { paymentMethods },
    });
}

// POST /api/admin/subscriptions/payment-methods
async function postHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const parsed = paymentMethodSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const paymentMethod = await PaymentMethod.create(parsed.data);

    return NextResponse.json(
        { success: true, message: 'تم إضافه‌ طريقة الدفع بنجاح', data: { paymentMethod } },
        { status: 201 }
    );
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
