import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { questionSchema } from '@/lib/validation/schemas';
import { JWTPayload } from '@/lib/auth/jwt';

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const grade = searchParams.get('grade') || '';
    const type = searchParams.get('type') || '';

    const filter: Record<string, unknown> = { isActive: true };
    if (difficulty) filter.difficulty = difficulty;
    if (grade) filter.grade = grade;
    if (type) filter.type = type;
    if (search) filter.$or = [{ text: { $regex: search, $options: 'i' } }];

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-choices.isCorrect') // Don't expose correct answers in list
        .lean();

    // For admin, include correct answers
    const questionsWithAnswers = await Question.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return NextResponse.json({
        success: true,
        data: { questions: questionsWithAnswers, total, page, pages: Math.ceil(total / limit) },
    });
}

async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const parsed = questionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    // Validate that at least one choice is correct
    const hasCorrect = parsed.data.choices.some((c) => c.isCorrect);
    if (!hasCorrect) {
        return NextResponse.json(
            { success: false, message: 'يجب تحديد إجابة صحيحة واحدة على الأقل' },
            { status: 400 }
        );
    }

    const question = await Question.create({
        ...parsed.data,
        createdBy: admin.userId,
    });

    return NextResponse.json(
        { success: true, message: 'تم إضافة السؤال', data: { question } },
        { status: 201 }
    );
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
