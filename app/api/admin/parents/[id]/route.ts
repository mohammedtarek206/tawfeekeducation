import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

async function deleteHandler(
    req: NextRequest,
    context: { params?: Record<string, string> },
    adminUser: JWTPayload
): Promise<NextResponse> {
    await connectDB();
    const parentId = context.params?.id;

    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
        return NextResponse.json({ success: false, message: 'معرف ولي الأمر غير صحيح' }, { status: 400 });
    }

    const parent = await User.findOne({ _id: parentId, role: 'parent' });
    if (!parent) {
        return NextResponse.json({ success: false, message: 'حساب ولي الأمر غير موجود' }, { status: 404 });
    }

    await User.findByIdAndDelete(parentId);

    await createAuditLog({
        actor: adminUser.userId,
        actorRole: 'admin',
        action: (AUDIT_ACTIONS as any).PARENT_DELETED || 'PARENT_DELETED',
        target: parentId,
        targetModel: 'User',
        metadata: { name: parent.name, phone: parent.phone },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: 'تم حذف حساب ولي الأمر بنجاح' });
}

export const DELETE = withAdmin((req, ctx, user) => deleteHandler(req, ctx, user));
