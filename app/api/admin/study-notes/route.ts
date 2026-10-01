import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Material from '@/lib/db/models/Material';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const notes = await Material.find({ type: 'notes' }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: { notes } });
}

async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    if (!body.title || !body.driveUrl || !body.grade || !body.subject) {
        return NextResponse.json({ success: false, message: 'العنوان، الرابط، المادة والصف الدراسي مطلوبين' }, { status: 400 });
    }

    const note = await Material.create({
        title: body.title,
        description: body.description || '',
        driveUrl: body.driveUrl,
        type: 'notes',
        grade: body.grade,
        subject: body.subject,
        isPublished: body.isPublished !== undefined ? body.isPublished : true,
        createdBy: admin.userId,
    });

    return NextResponse.json({ success: true, message: 'تم إضافة المذكرة بنجاح', data: { note } });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
