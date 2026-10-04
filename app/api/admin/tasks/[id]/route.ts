import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Task from '@/lib/db/models/Task';
import { withAdmin } from '@/lib/auth/middleware';

async function putHandler(req: NextRequest, ctx: unknown): Promise<NextResponse> {
    await connectDB();
    const params = (ctx as { params: { id: string } }).params;
    const { id } = params;
    const body = await req.json();

    const updated = await Task.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
        return NextResponse.json({ success: false, message: 'المهمة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم تحديث المهمة بنجاح ✅', data: { task: updated } });
}

async function deleteHandler(_req: NextRequest, ctx: unknown): Promise<NextResponse> {
    await connectDB();
    const params = (ctx as { params: { id: string } }).params;
    const { id } = params;

    const deleted = await Task.findByIdAndDelete(id);
    if (!deleted) {
        return NextResponse.json({ success: false, message: 'المهمة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف المهمة بنجاح' });
}

export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
