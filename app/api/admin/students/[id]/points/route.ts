import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

async function handler(
    req: NextRequest,
    context: { params?: Record<string, string> },
    adminUser: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const studentId = context.params?.id;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    const body = await req.json();
    const { amount, reason } = body;

    const parsedAmount = parseInt(String(amount), 10);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
        return NextResponse.json({ success: false, message: 'يرجى إدخال عدد نقاط صحيح غير صفر' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return NextResponse.json({ success: false, message: 'يرجى كتابة سبب رصيد/خصم النقاط (3 أحرف على الأقل)' }, { status: 400 });
    }

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    // Award / Deduct points using central engine
    const result = await awardPoints({
        studentId,
        amount: parsedAmount,
        type: 'admin_adjustment',
        reason: reason.trim(),
        awardedBy: adminUser.userId,
    });

    if (!result.success) {
        return NextResponse.json({ success: false, message: result.error || 'فشل تعديل النقاط' }, { status: 500 });
    }

    await createAuditLog({
        actor: adminUser.userId,
        actorRole: 'admin',
        action: 'POINTS_ADJUSTED',
        target: studentId,
        targetModel: 'User',
        metadata: { amount: parsedAmount, reason: reason.trim(), newBalance: result.newBalance },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
        success: true,
        message: parsedAmount > 0 ? `تم إضافة ${parsedAmount} نقطة للطالب بنجاح` : `تم خصم ${Math.abs(parsedAmount)} نقطة من الطالب بنجاح`,
        data: {
            newBalance: result.newBalance,
        },
    });
}

export const POST = withAdmin((req, ctx, user) => handler(req, ctx, user));
