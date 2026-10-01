import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SolutionVideo from '@/lib/db/models/SolutionVideo';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

// PATCH toggle publish or update
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ success: false, message: 'معرف غير صحيح' }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();
        const video = await SolutionVideo.findByIdAndUpdate(params.id, body, { new: true });

        if (!video) return NextResponse.json({ success: false, message: 'الفيديو غير موجود' }, { status: 404 });

        return NextResponse.json({ success: true, data: { video } });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ success: false, message: 'معرف غير صحيح' }, { status: 400 });
        }

        await connectDB();
        await SolutionVideo.findByIdAndDelete(params.id);

        return NextResponse.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
