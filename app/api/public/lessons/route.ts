import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '6');
        const grade = searchParams.get('grade') || '';

        const filter: Record<string, unknown> = { isPublished: true, showOnHomepage: true };
        if (grade) filter.grade = grade;

        const lessons = await Lesson.find(filter)
            .select('title lessonNumber unit grade duration description youtubeId thumbnail createdAt isFree showOnHomepage subject')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, data: { lessons } });
    } catch (error: unknown) {
        console.error('[API /public/lessons] Error:', (error as Error)?.message ?? error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء جلب الدروس' }, { status: 500 });
    }
}
