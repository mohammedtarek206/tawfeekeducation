import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import User from '@/lib/db/models/User';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/student/questions - get student question bank with filters
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('grade');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || '';
    const type = searchParams.get('type') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all | solved | unsolved
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Build base filter - strictly respect student grade & active published questions
    const filter: Record<string, any> = {
        isActive: true,
        subject: { $ne: 'geography' }, // Archived
    };

    if (studentUser.grade && studentUser.grade.trim() !== '') {
        filter.grade = studentUser.grade;
    }
    if (subject) filter.subject = subject;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
        filter.text = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    // Determine solved questions by this student across all attempts
    const attempts = await ExamAttempt.find({
        student: student.userId,
        status: 'submitted',
    }).select('answers.questionId').lean();

    const solvedQuestionIds = new Set<string>();
    attempts.forEach((att: any) => {
        (att.answers || []).forEach((ans: any) => {
            if (ans.questionId) {
                solvedQuestionIds.add(ans.questionId.toString());
            }
        });
    });

    if (status === 'solved') {
        filter._id = { $in: Array.from(solvedQuestionIds) };
    } else if (status === 'unsolved') {
        filter._id = { $nin: Array.from(solvedQuestionIds) };
    }

    const total = await Question.countDocuments(filter);
    const totalAvailable = await Question.countDocuments({
        isActive: true,
        subject: { $ne: 'geography' },
        ...(studentUser.grade ? { grade: studentUser.grade } : {}),
    });

    const questions = await Question.find(filter)
        .select('text type choices difficulty points image subject grade order')
        .sort({ order: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    // SECURITY: Strip isCorrect, correct answer, explanation, and model answers!
    const safeQuestions = questions.map((q: any) => ({
        _id: q._id.toString(),
        text: q.text,
        type: q.type,
        choices: q.type === 'essay'
            ? []
            : (q.choices || []).map((c: any) => ({ text: c.text })),
        difficulty: q.difficulty || 'medium',
        points: q.points || 1,
        image: q.image || undefined,
        subject: q.subject,
        grade: q.grade,
        isSolved: solvedQuestionIds.has(q._id.toString()),
    }));

    return NextResponse.json({
        success: true,
        data: {
            questions: safeQuestions,
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            stats: {
                totalAvailable,
                totalSolved: solvedQuestionIds.size,
                solvedMatchingFilter: status === 'solved' ? total : undefined,
            },
        },
    });
}

export const GET = withStudent(getHandler);
