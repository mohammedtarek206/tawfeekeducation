import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { loginSchema } from '@/lib/validation/schemas';
import { signToken } from '@/lib/auth/jwt';
import { loginRateLimit } from '@/lib/security/rateLimit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const limited = loginRateLimit(req);
    if (limited) return limited;

    try {
        await connectDB();
        const body = await req.json();

        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { phone, password } = parsed.data;

        const admin = await User.findOne({ phone, role: 'admin' }).select('+password');
        if (!admin) {
            return NextResponse.json(
                { success: false, message: 'بيانات الدخول غير صحيحة' },
                { status: 401 }
            );
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return NextResponse.json(
                { success: false, message: 'بيانات الدخول غير صحيحة' },
                { status: 401 }
            );
        }

        await User.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

        const token = await signToken({
            userId: admin._id.toString(),
            role: 'admin',
            phone: admin.phone,
            status: 'approved',
        });

        await createAuditLog({
            actor: admin._id.toString(),
            actorRole: 'admin',
            action: AUDIT_ACTIONS.ADMIN_LOGIN,
            metadata: { phone },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        });

        const response = NextResponse.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            data: {
                user: {
                    id: admin._id.toString(),
                    name: admin.name,
                    role: 'admin',
                },
            },
        });

        const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https');
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && isHttps,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ، حاول مرة أخرى' },
            { status: 500 }
        );
    }
}
