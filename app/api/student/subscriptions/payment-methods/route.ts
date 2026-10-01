import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PaymentMethod from '@/lib/db/models/PaymentMethod';
import { withStudent } from '@/lib/auth/middleware';

// GET /api/student/subscriptions/payment-methods
async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    let paymentMethods = await PaymentMethod.find({ active: true }).sort({ createdAt: -1 }).lean();

    if (paymentMethods.length === 0) {
        // Seed initial payment methods if none exist
        await PaymentMethod.create([
            {
                name: 'فودافون كاش (Vodafone Cash)',
                number: '01094448448',
                accountName: 'منصة التوفيق التعليمية',
                instructions: 'قم بتحويل قيمة الاشتراك إلى الرقم أعلاه عبر فودافون كاش، ثم ارفع صورة إيصال التحويل أدناه.',
                active: true
            },
            {
                name: 'إنستاباي (InstaPay)',
                number: '01094448448',
                accountName: 'منصة التوفيق التعليمية',
                instructions: 'قم بتحويل قيمة الاشتراك عبر تطبيق إنستاباي إلى الرقم أو اسم الحساب، ثم ارفع صورة إيصال التحويل.',
                active: true
            }
        ]);
        paymentMethods = await PaymentMethod.find({ active: true }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({
        success: true,
        data: { paymentMethods },
    });
}

export const GET = withStudent(getHandler);
