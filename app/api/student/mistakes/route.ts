import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Question from '@/lib/db/models/Question';
import Exam from '@/lib/db/models/Exam';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/student/mistakes
// Returns all wrong answers grouped, with filters
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || '';
    const examType = searchParams.get('examType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all submitted attempts for this student
    const attemptFilter: Record<string, unknown> = {
        student: student.userId,
        status: 'submitted',
    };
    if (examType) attemptFilter.examType = examType;

    const attempts = await ExamAttempt.find(attemptFilter)
        .sort({ submittedAt: -1 })
        .lean();

    if (!attempts.length) {
        return NextResponse.json({
            success: true,
            data: { mistakes: [], total: 0, page, pages: 0 },
        });
    }

    // Collect all wrong answer records
    const wrongAnswers: Array<{
        questionId: string;
        selectedChoiceIndex: number;
        attemptId: string;
        examRef: string;
        examType: string;
        submittedAt: Date | undefined;
    }> = [];

    for (const attempt of (attempts as any[])) {
        for (const answer of (attempt.answers || [])) {
            if (!answer.isCorrect) {
                wrongAnswers.push({
                    questionId: answer.questionId.toString(),
                    selectedChoiceIndex: answer.selectedChoiceIndex,
                    attemptId: attempt._id.toString(),
                    examRef: attempt.examRef.toString(),
                    examType: attempt.examType,
                    submittedAt: attempt.submittedAt,
                });
            }
        }
    }


    if (!wrongAnswers.length) {
        return NextResponse.json({
            success: true,
            data: { mistakes: [], total: 0, page, pages: 0 },
        });
    }

    // Get unique question IDs
    const uniqueQuestionIds = Array.from(new Set(wrongAnswers.map((w) => w.questionId)));

    // Build question filter (subject)
    const qFilter: Record<string, unknown> = { _id: { $in: uniqueQuestionIds } };
    if (subject) qFilter.subject = subject;

    const questions = await Question.find(qFilter).lean();

    // Build exam map for titles
    const examIds = Array.from(new Set(wrongAnswers.map((w) => w.examRef)));

    const exams = await Exam.find({ _id: { $in: examIds } })
        .select('title type subject')
        .lean();
    const examMap = new Map(exams.map((e) => [e._id.toString(), e]));

    // Compose enriched mistakes list
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const mistakesList = wrongAnswers
        .filter((w) => questionMap.has(w.questionId))
        .map((w) => {
            const q = questionMap.get(w.questionId)!;
            const exam = examMap.get(w.examRef);
            const correctChoiceIndex = (q.choices as Array<{ isCorrect: boolean }>).findIndex((c) => c.isCorrect);
            return {
                questionId: q._id,
                questionText: q.text,
                choices: q.choices,
                selectedChoiceIndex: w.selectedChoiceIndex,
                correctChoiceIndex,
                subject: q.subject,
                grade: q.grade,
                difficulty: q.difficulty,
                examTitle: exam ? (exam as unknown as { title: string }).title : 'اختبار',
                examType: w.examType,
                examRef: w.examRef,
                attemptId: w.attemptId,
                submittedAt: w.submittedAt,
            };
        });

    // Sort by newest first
    mistakesList.sort((a, b) => {
        const da = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const db_ = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return db_ - da;
    });

    const total = mistakesList.length;
    const pages = Math.ceil(total / limit);
    const paginated = mistakesList.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
        success: true,
        data: { mistakes: paginated, total, page, pages },
    });
}

export const GET = withStudent(getHandler);
