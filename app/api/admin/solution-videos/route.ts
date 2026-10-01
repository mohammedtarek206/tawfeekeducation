import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import SolutionVideo from '@/lib/db/models/SolutionVideo';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';

// GET all solution videos
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const grade = searchParams.get('grade');
        const query: any = {};
        if (grade) query.grade = grade;

        const videos = await SolutionVideo.find(query).sort({ createdAt: -1 }).lean();

        return NextResponse.json({ success: true, data: { videos } });
    } catch (error) {
        console.error('Solution Videos GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ في جلب البيانات' }, { status: 500 });
    }
}

// POST create new solution video
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { title, description, youtubeUrl, grade, isPublished } = body;

        if (!title || !youtubeUrl || !grade) {
            return NextResponse.json(
                { success: false, message: 'العنوان ورابط اليوتيوب والصف الدراسي مطلوبون' },
                { status: 400 }
            );
        }

        const video = await SolutionVideo.create({
            title,
            description,
            youtubeUrl,
            grade,
            isPublished: isPublished ?? false,
            createdBy: payload.userId,
        });

        return NextResponse.json({ success: true, data: { video } }, { status: 201 });
    } catch (error) {
        console.error('Solution Videos POST error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء الحفظ' }, { status: 500 });
    }
}
