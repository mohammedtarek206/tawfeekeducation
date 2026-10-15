import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SolutionVideo from '@/lib/db/models/SolutionVideo';
import Lesson from '@/lib/db/models/Lesson';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

// ─── Helper: auth check ───────────────────────────────────────────────────────
async function requireAdmin(req: NextRequest) {
    const token = getTokenFromRequest(req);
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== 'admin') return null;
    return payload;
}

// ─── PATCH: update solution video ─────────────────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const admin = await requireAdmin(req);
        if (!admin) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ success: false, message: 'معرف غير صحيح' }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();

        // Whitelist allowed fields to prevent mass-assignment
        const {
            title,
            description,
            youtubeUrl,
            grade,
            lesson,
            isPublished,
        } = body;

        const update: Record<string, unknown> = {};
        if (title !== undefined) update.title = String(title).trim();
        if (description !== undefined) update.description = String(description).trim();
        if (youtubeUrl !== undefined) update.youtubeUrl = String(youtubeUrl).trim();
        if (grade !== undefined) update.grade = String(grade).trim();
        if (isPublished !== undefined) update.isPublished = Boolean(isPublished);

        // Handle lesson link: validate ObjectId or clear the field
        if (lesson !== undefined) {
            if (lesson && typeof lesson === 'string' && lesson.trim() !== '') {
                if (!mongoose.Types.ObjectId.isValid(lesson)) {
                    return NextResponse.json(
                        { success: false, message: 'معرف الحصة غير صالح' },
                        { status: 400 }
                    );
                }
                // Verify lesson actually exists
                const lessonExists = await Lesson.exists({ _id: lesson });
                if (!lessonExists) {
                    return NextResponse.json(
                        { success: false, message: 'الحصة المحددة غير موجودة في قاعدة البيانات' },
                        { status: 404 }
                    );
                }
                update.lesson = new mongoose.Types.ObjectId(lesson);
            } else {
                // Explicitly unset lesson link
                update.lesson = undefined;
            }
        }

        const video = await SolutionVideo.findByIdAndUpdate(
            params.id,
            lesson === '' || lesson === null || lesson === undefined
                ? { $set: update, $unset: { lesson: '' } }
                : { $set: update },
            { new: true, runValidators: true }
        ).populate('lesson', 'title unit');

        if (!video) {
            return NextResponse.json({ success: false, message: 'الفيديو غير موجود' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: { video } });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[PATCH solution-video]', msg);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء التحديث' }, { status: 500 });
    }
}

// ─── DELETE: remove solution video ────────────────────────────────────────────
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const admin = await requireAdmin(req);
        if (!admin) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return NextResponse.json({ success: false, message: 'معرف غير صحيح' }, { status: 400 });
        }

        await connectDB();
        const deleted = await SolutionVideo.findByIdAndDelete(params.id);

        if (!deleted) {
            return NextResponse.json({ success: false, message: 'الفيديو غير موجود' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'تم حذف الفيديو بنجاح' });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[DELETE solution-video]', msg);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء الحذف' }, { status: 500 });
    }
}
