import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import OTP from '@/lib/db/models/OTP';
import { phoneSchema } from '@/lib/validation/schemas';
import { sendOTP } from '@/lib/sms/smsService';
import { otpRateLimit } from '@/lib/security/rateLimit';
import crypto from 'crypto';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const limited = otpRateLimit(req);
    if (limited) return limited;

    try {
        await connectDB();
        const body = await req.json();

        const parsed = phoneSchema.safeParse(body.phone);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const phone = parsed.data;

        // Find user
        const user = await User.findOne({ phone });
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف غير مسجل' },
                { status: 404 }
            );
        }

        if (user.phoneVerified) {
            return NextResponse.json(
                { success: false, message: 'تم التحقق من هاتفك بالفعل' },
                { status: 400 }
            );
        }

        // Rate limit: check last OTP
        const lastOTP = await OTP.findOne({ phone }).sort({ createdAt: -1 });
        if (lastOTP) {
            const timeSinceLastRequest =
                (Date.now() - new Date(lastOTP.createdAt).getTime()) / 1000;
            if (timeSinceLastRequest < 60) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `انتظر ${Math.ceil(60 - timeSinceLastRequest)} ثانية قبل إعادة الإرسال`,
                    },
                    { status: 429 }
                );
            }
        }

        // Generate new OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
        const expiresAt = new Date(
            Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60 * 1000
        );

        await OTP.deleteMany({ phone });
        await OTP.create({ phone, otpHash, expiresAt });

        await sendOTP(phone, otpCode);

        return NextResponse.json({
            success: true,
            message: 'تم إرسال كود جديد إلى هاتفك',
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ، حاول مرة أخرى' },
            { status: 500 }
        );
    }
}
