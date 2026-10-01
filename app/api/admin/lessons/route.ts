import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import { withAdmin } from '@/lib/auth/middleware';
import { lessonSchema } from '@/lib/validation/schemas';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

// GET /api/admin/lessons
async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    const published = searchParams.get('published');

    const filter: Record<string, unknown> = {};
    if (grade) filter.grade = grade;
    if (published !== null && published !== '') filter.isPublished = published === 'true';
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { unit: { $regex: search, $options: 'i' } },
        ];
    }

    const total = await Lesson.countDocuments(filter);
    const lessons = await Lesson.find(filter)
        .sort({ grade: 1, lessonNumber: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return NextResponse.json({
        success: true,
        data: { lessons, total, page, pages: Math.ceil(total / limit) },
    });
}

// POST /api/admin/lessons
async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const parsed = lessonSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    const lesson = await Lesson.create({
        ...parsed.data,
        createdBy: admin.userId,
    });

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.LESSON_CREATED,
        target: lesson._id.toString(),
        targetModel: 'Lesson',
        metadata: { title: lesson.title },
    });

    return NextResponse.json(
        { success: true, message: 'تم إنشاء الحصة بنجاح', data: { lesson } },
        { status: 201 }
    );
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
