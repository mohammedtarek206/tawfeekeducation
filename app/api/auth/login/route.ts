import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { loginSchema } from '@/lib/validation/schemas';
import { signToken, setAuthCookie } from '@/lib/auth/jwt';
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

        // Find user with password (select: false by default)
        const user = await User.findOne({ phone }).select('+password');
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
                { status: 401 }
            );
        }

        // Only allow student and parent roles on this endpoint
        if (user.role === 'admin') {
            return NextResponse.json(
                { success: false, message: 'يرجى استخدام صفحة تسجيل دخول المدير' },
                { status: 403 }
            );
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return NextResponse.json(
                { success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
                { status: 401 }
            );
        }

        // Check student status
        if (user.role === 'student') {
            if (user.status === 'pending') {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'حسابك في انتظار موافقة الإدارة',
                        status: 'pending',
                    },
                    { status: 403 }
                );
            }
            if (user.status === 'rejected') {
                return NextResponse.json(
                    { success: false, message: 'تم رفض طلب تسجيلك، تواصل مع الإدارة' },
                    { status: 403 }
                );
            }
            if (user.status === 'suspended') {
                return NextResponse.json(
                    { success: false, message: 'تم إيقاف حسابك، تواصل مع الإدارة' },
                    { status: 403 }
                );
            }
        }

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        // Sign token
        const token = await signToken({
            userId: user._id.toString(),
            role: user.role,
            phone: user.phone,
            status: user.status,
        });

        const response = NextResponse.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            data: {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    grade: user.grade,
                    points: user.points,
                    level: user.level,
                },
            },
        });

        // Set HTTP-only cookie
        const isLocalhost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !isLocalhost,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ، حاول مرة أخرى' },
            { status: 500 }
        );
    }
}
