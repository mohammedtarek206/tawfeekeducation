import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import OTP from '@/lib/db/models/OTP';
import { otpVerifySchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();
        const body = await req.json();

        const parsed = otpVerifySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { phone, otp } = parsed.data;

        // Find most recent OTP for this phone
        const otpRecord = await OTP.findOne({
            phone,
            verified: false,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return NextResponse.json(
                { success: false, message: 'انتهت صلاحية الكود أو الكود غير موجود، أعد إرسال كود جديد' },
                { status: 400 }
            );
        }

        // Check max attempts
        const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');
        if (otpRecord.attempts >= maxAttempts) {
            await OTP.findByIdAndDelete(otpRecord._id);
            return NextResponse.json(
                { success: false, message: 'تجاوزت عدد المحاولات المسموحة، أعد إرسال كود جديد' },
                { status: 429 }
            );
        }

        // Compare hash
        const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (inputHash !== otpRecord.otpHash) {
            await OTP.findByIdAndUpdate(otpRecord._id, { $inc: { attempts: 1 } });
            const remaining = maxAttempts - otpRecord.attempts - 1;
            return NextResponse.json(
                {
                    success: false,
                    message: `الكود غير صحيح${remaining > 0 ? ` (متبقي ${remaining} محاولات)` : ''}`,
                },
                { status: 400 }
            );
        }

        // Mark OTP as verified
        await OTP.findByIdAndUpdate(otpRecord._id, { verified: true });

        // Update user phone verification
        const user = await User.findOneAndUpdate(
            { phone },
            { phoneVerified: true },
            { new: true }
        ).select('name phone status grade role');

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'المستخدم غير موجود' },
                { status: 404 }
            );
        }

        // Update referral status to verified
        const { default: Referral } = await import('@/lib/db/models/Referral');
        await Referral.updateMany(
            { referred: user._id, status: 'pending' },
            { status: 'verified' }
        );

        // Sign token
        const { signToken } = await import('@/lib/auth/jwt');
        const token = await signToken({
            userId: user._id.toString(),
            role: user.role,
            phone: user.phone,
            status: user.status,
        });

        const response = NextResponse.json({
            success: true,
            message: 'تم التحقق من رقم هاتفك بنجاح',
            data: {
                status: user.status,
                message:
                    'تم استلام طلب التسجيل بنجاح، وحسابك الآن في انتظار موافقة الإدارة. سيتم إشعارك عند التفعيل.',
            },
        });

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('OTP verify error:', error);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ، حاول مرة أخرى' },
            { status: 500 }
        );
    }
}
