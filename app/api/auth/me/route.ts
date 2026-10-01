import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return NextResponse.json({ success: false, message: 'غير مسجل الدخول' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: 'جلسة غير صالحة' }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(payload.userId).select(
            'name phone role status grade governorate points level streak isFreeStudent avatar referralCode parentName parentPhone'
        );

        if (!user) {
            return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: { user },
        });
    } catch (error) {
        console.error('Get me error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
