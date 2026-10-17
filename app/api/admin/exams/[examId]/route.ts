import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// PATCH /api/admin/exams/[examId] — toggle publish or update fields
async function patchHandler(
    req: NextRequest,
    ctx: any,
    _admin: JWTPayload
): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const examId = ctx.params?.examId;

    // إذا كان body يحتوي على حقول التعديل الكامل (title موجود)
    // ويكون النوع غير quiz، نحذف lessonId من قاعدة البيانات
    const updateOp: Record<string, unknown> = { $set: body };
    if ('type' in body && body.type !== 'quiz') {
        // حذف lessonId إن وُجد وتغيّر النوع لغير quiz
        (updateOp as any).$unset = { lessonId: '' };
    }

    const exam = await Exam.findByIdAndUpdate(
        examId,
        updateOp,
        { new: true, runValidators: false }
    ).lean();

    if (!exam) {
        return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم تحديث الامتحان', data: { exam } });
}

// DELETE /api/admin/exams/[examId]
async function deleteHandler(
    req: NextRequest,
    ctx: any,
    _admin: JWTPayload
): Promise<NextResponse> {
    await connectDB();
    const examId = ctx.params?.examId;

    const exam = await Exam.findByIdAndDelete(examId);
    if (!exam) {
        return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف الامتحان بنجاح' });
}

export const PATCH = withAdmin(patchHandler);
export const DELETE = withAdmin(deleteHandler);
