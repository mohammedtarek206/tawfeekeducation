import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SolutionVideo from '@/lib/db/models/SolutionVideo';
import Lesson from '@/lib/db/models/Lesson';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

async function requireAdmin(req: NextRequest) {
    const token = getTokenFromRequest(req);
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== 'admin') return null;
    return payload;
}

// ─── GET: list all solution videos ────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const admin = await requireAdmin(req);
        if (!admin) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const grade = searchParams.get('grade');
        const query: Record<string, unknown> = {};
        if (grade) query.grade = grade;

        const videos = await SolutionVideo.find(query)
            .populate('lesson', 'title unit lessonNumber grade')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, data: { videos } });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[GET solution-videos]', msg);
        return NextResponse.json({ success: false, message: 'حدث خطأ في جلب البيانات' }, { status: 500 });
    }
}

// ─── POST: create new solution video ──────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const admin = await requireAdmin(req);
        if (!admin) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { title, description, youtubeUrl, grade, isPublished, lesson } = body;

        if (!title || !youtubeUrl || !grade) {
            return NextResponse.json(
                { success: false, message: 'العنوان ورابط اليوتيوب والصف الدراسي مطلوبون' },
                { status: 400 }
            );
        }

        const videoData: Record<string, unknown> = {
            title: String(title).trim(),
            description: description ? String(description).trim() : undefined,
            youtubeUrl: String(youtubeUrl).trim(),
            grade: String(grade).trim(),
            isPublished: isPublished ?? false,
            createdBy: admin.userId,
        };

        // Validate and attach lesson reference if provided
        if (lesson && typeof lesson === 'string' && lesson.trim() !== '') {
            if (!mongoose.Types.ObjectId.isValid(lesson)) {
                return NextResponse.json(
                    { success: false, message: 'معرف الحصة غير صالح' },
                    { status: 400 }
                );
            }
            const lessonExists = await Lesson.exists({ _id: lesson });
            if (!lessonExists) {
                return NextResponse.json(
                    { success: false, message: 'الحصة المحددة غير موجودة في قاعدة البيانات' },
                    { status: 404 }
                );
            }
            videoData.lesson = new mongoose.Types.ObjectId(lesson);
        }

        const video = await SolutionVideo.create(videoData);
        const populated = await SolutionVideo.findById(video._id)
            .populate('lesson', 'title unit lessonNumber grade')
            .lean();

        return NextResponse.json({ success: true, data: { video: populated } }, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[POST solution-videos]', msg);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء الحفظ' }, { status: 500 });
    }
}
