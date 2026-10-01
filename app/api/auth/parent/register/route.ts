import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { parentRegisterSchema } from '@/lib/validation/schemas';
import { otpRateLimit } from '@/lib/security/rateLimit';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const limited = otpRateLimit(req);
    if (limited) return limited;

    try {
        await connectDB();
        const body = await req.json();

        // Validate
        const parsed = parentRegisterSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { name, phone, password } = parsed.data;

        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف مسجل بالفعل' },
                { status: 409 }
            );
        }

        // Create parent user
        await User.create({
            name,
            phone,
            password,
            role: 'parent',
            status: 'approved', // Parents don't usually need approval just to register
            phoneVerified: true, // Assuming true for now, can be changed if OTP is required for parents
            points: 0,
            level: 1,
            streak: 0,
        });

        return NextResponse.json({
            success: true,
            message: 'تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول',
        });
    } catch (error) {
        console.error('Parent Register error:', error);
        if ((error as { code?: number }).code === 11000) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف مسجل بالفعل' },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { success: false, message: 'حدث خطأ، حاول مرة أخرى' },
            { status: 500 }
        );
    }
}
