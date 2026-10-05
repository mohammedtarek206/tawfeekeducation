import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { registerSchema, parentRegisterSchema } from '@/lib/validation/schemas';
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

        const isParent = body.role === 'parent';

        // Validate
        const parsed = isParent ? parentRegisterSchema.safeParse(body) : registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const data = parsed.data;
        const phone = data.phone;
        const password = data.password;

        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف مسجل بالفعل' },
                { status: 409 }
            );
        }

        let user;

        if (isParent) {
            // Create Parent
            user = await User.create({
                name: data.name,
                phone: data.phone,
                password: data.password,
                role: 'parent',
                status: 'approved', // Or pending based on rules. Usually parents are active immediately.
                phoneVerified: true,
            });
        } else {
            // It's a student
            const studentData = data as any; // Using any for simplicity since we know it matches registerSchema

            // Validate referral code if provided
            let referrerId: mongoose.Types.ObjectId | undefined;
            if (studentData.referralCode) {
                const referrer = await User.findOne({ referralCode: studentData.referralCode, role: 'student', status: 'approved' });
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
            const uniqueReferralCode = generateReferralCode(studentData.name);
            const parentLinkingCode = 'TWF-' + Math.random().toString(36).substring(2, 7).toUpperCase();

            user = await User.create({
                name: studentData.name,
                phone: studentData.phone,
                password: studentData.password,
                role: 'student',
                status: 'pending',
                phoneVerified: true,
                grade: studentData.grade,
                governorate: studentData.governorate,
                parentName: studentData.parentName,
                parentPhone: studentData.parentPhone,
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
                    code: studentData.referralCode,
                    status: 'pending',
                });
            }
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
