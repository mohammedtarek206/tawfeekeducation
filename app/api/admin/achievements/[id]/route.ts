import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Achievement from '@/lib/db/models/Achievement';
import { withAdmin } from '@/lib/auth/middleware';

async function putHandler(req: NextRequest, ctx: unknown): Promise<NextResponse> {
    await connectDB();
    const params = (ctx as { params: { id: string } }).params;
    const { id } = params;
    const body = await req.json();

    const updated = await Achievement.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
        return NextResponse.json({ success: false, message: 'الإنجاز غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم تحديث الإنجاز بنجاح ✅', data: { achievement: updated } });
}

async function deleteHandler(_req: NextRequest, ctx: unknown): Promise<NextResponse> {
    await connectDB();
    const params = (ctx as { params: { id: string } }).params;
    const { id } = params;

    const deleted = await Achievement.findByIdAndDelete(id);
    if (!deleted) {
        return NextResponse.json({ success: false, message: 'الإنجاز غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف الإنجاز بنجاح' });
}

export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
