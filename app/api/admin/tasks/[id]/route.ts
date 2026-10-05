import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Task from '@/lib/db/models/Task';
import { withAdmin } from '@/lib/auth/middleware';

async function putHandler(req: NextRequest, ctx: unknown): Promise<NextResponse> {
    await connectDB();
    const params = (ctx as { params: { id: string } }).params;
    const { id } = params;
    const body = await req.json();

    let updateBody = { ...body };

    if (updateBody.targetAudience === 'specific_students' && typeof updateBody.specificStudents === 'string') {
        const { default: mongoose } = await import('mongoose');
        const items = updateBody.specificStudents.split(',').map((s: string) => s.trim()).filter(Boolean);
        const phones = items.filter((s: string) => /^01[0-9]{9}$/.test(s));
        const customIds = items.filter((s: string) => mongoose.Types.ObjectId.isValid(s));

        let specificStudentIds: mongoose.Types.ObjectId[] = [];
        if (phones.length > 0 || customIds.length > 0) {
            const { default: User } = await import('@/lib/db/models/User');
            const users = await User.find({
                $or: [
                    { phone: { $in: phones } },
                    { _id: { $in: customIds } }
                ]
            }).select('_id');
            specificStudentIds = users.map(u => u._id);
        }
        updateBody.specificStudents = specificStudentIds;
    } else if (updateBody.targetAudience !== 'specific_students') {
        updateBody.specificStudents = [];
    }

    const updated = await Task.findByIdAndUpdate(id, updateBody, { new: true });
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
