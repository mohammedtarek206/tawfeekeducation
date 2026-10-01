import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { registerSchema } from '@/lib/validation/schemas';
import { otpRateLimit } from '@/lib/security/rateLimit';
import { generateReferralCode } from '@/lib/utils/helpers';
import mongoose from 'mongoose';

export async function POST(req: NextRequest): Promise<NextResponse> {
    // Rate limit
    const limited = otpRateLimit(req);
    if (limited) return limited;

    try {
        await connectDB();
        const body = await req.json();

        // Validate
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { name, phone, password, parentName, parentPhone, grade, governorate, referralCode } =
            parsed.data;

        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف مسجل بالفعل' },
                { status: 409 }
            );
        }

        // Validate referral code if provided
        let referrerId: mongoose.Types.ObjectId | undefined;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode, role: 'student', status: 'approved' });
            if (!referrer) {
                return NextResponse.json(
                    { success: false, message: 'كود الدعوة غير صحيح' },
                    { status: 400 }
                );
            }
            // Prevent self-referral
            if (referrer.phone === phone) {
                return NextResponse.json(
                    { success: false, message: 'لا يمكنك استخدام كود الدعوة الخاص بك' },
                    { status: 400 }
                );
            }
            referrerId = referrer._id as mongoose.Types.ObjectId;
        }

        // Create user
        const uniqueReferralCode = generateReferralCode(name);
        // Custom short code for parent linking e.g., TWF-XXXXX
        const parentLinkingCode = 'TWF-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        const user = await User.create({
            name,
            phone,
            password,
            role: 'student',
            status: 'pending',
            phoneVerified: true,
            grade,
            governorate,
            parentName,
            parentPhone,
            referralCode: uniqueReferralCode,
            parentLinkingCode,
            referredBy: referrerId,
        });

        // Create referral record if applicable
        if (referrerId) {
            const { default: Referral } = await import('@/lib/db/models/Referral');
            await Referral.create({
                referrer: referrerId,
                referred: user._id,
                code: referralCode,
                status: 'pending',
            });
        }

        const response = NextResponse.json({
            success: true,
            message: 'تم التسجيل بنجاح. طلبك الآن قيد مراجعة الإدارة.',
            requiresOTP: false,
        });

        return response;
    } catch (error) {
        console.error('Register error:', error);
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
