import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import { withAdmin } from '@/lib/auth/middleware';
import { lessonSchema } from '@/lib/validation/schemas';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

// PUT /api/admin/lessons/[id]
async function putHandler(
    req: NextRequest,
    ctx: { params: { id: string } },
    admin: JWTPayload
): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const parsed = lessonSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const lesson = await Lesson.findByIdAndUpdate(ctx.params.id, parsed.data, { new: true });
    if (!lesson) {
        return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });
    }

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.LESSON_UPDATED || 'LESSON_UPDATED',
        target: lesson._id.toString(),
        targetModel: 'Lesson',
        metadata: { title: lesson.title },
    });

    return NextResponse.json({ success: true, message: 'تم تحديث الحصة بنجاح', data: { lesson } });
}

// DELETE /api/admin/lessons/[id]
async function deleteHandler(
    req: NextRequest,
    ctx: { params: { id: string } },
    admin: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const lesson = await Lesson.findByIdAndDelete(ctx.params.id);
    if (!lesson) {
        return NextResponse.json({ success: false, message: 'الحصة غير موجودة' }, { status: 404 });
    }

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.LESSON_DELETED || 'LESSON_DELETED',
        target: lesson._id.toString(),
        targetModel: 'Lesson'
    });

    return NextResponse.json({ success: true, message: 'تم حذف الحصة بنجاح' });
}

export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
