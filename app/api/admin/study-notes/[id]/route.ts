import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Material from '@/lib/db/models/Material';
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
    const id = context.params?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, message: 'المعرف غير صحيح' }, { status: 400 });
    }

    const note = await Material.findByIdAndDelete(id);
    if (!note) {
        return NextResponse.json({ success: false, message: 'المذكرة غير موجودة' }, { status: 404 });
    }

    await createAuditLog({
        actor: adminUser.userId,
        actorRole: 'admin',
        action: (AUDIT_ACTIONS as any).MATERIAL_DELETED || 'MATERIAL_DELETED',
        target: id,
        targetModel: 'Material',
        metadata: { title: note.title },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: 'تم حذف المذكرة بنجاح' });
}

export const DELETE = withAdmin((req, ctx, user) => deleteHandler(req, ctx, user));
