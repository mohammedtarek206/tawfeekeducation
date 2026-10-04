import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';

async function getHandler(): Promise<NextResponse> {
    await connectDB();

    // Aggregate wrong answers per question
    const attempts = await ExamAttempt.find({ status: 'submitted' })
        .select('answers student submittedAt')
        .lean();

    const questionMistakesMap = new Map<string, { count: number; studentIds: Set<string> }>();

    for (const att of (attempts as any[])) {
        for (const ans of (att.answers || [])) {

            if (!ans.isCorrect && ans.questionId) {
                const qId = ans.questionId.toString();
                const current = questionMistakesMap.get(qId) || { count: 0, studentIds: new Set<string>() };
                current.count += 1;
                if (att.student) current.studentIds.add(att.student.toString());
                questionMistakesMap.set(qId, current);
            }
        }
    }

    const questionIds = Array.from(questionMistakesMap.keys());
    const questions = await Question.find({ _id: { $in: questionIds } })
        .select('text subject grade difficulty choices')
        .lean();

    const topMistakenQuestions = questions
        .map((q) => {
            const data = questionMistakesMap.get(q._id.toString())!;
            return {
                _id: q._id,
                text: q.text,
                subject: q.subject,
                grade: q.grade,
                difficulty: q.difficulty,
                errorCount: data.count,
                affectedStudentsCount: data.studentIds.size,
            };
        })
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 50);

    return NextResponse.json({
        success: true,
        data: {
            topMistakenQuestions,
            totalMistakesRecorded: Array.from(questionMistakesMap.values()).reduce((acc, curr) => acc + curr.count, 0),
        },
    });
}

export const GET = withAdmin(getHandler);
