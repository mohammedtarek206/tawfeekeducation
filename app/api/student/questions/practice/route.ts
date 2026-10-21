import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import mongoose from 'mongoose';

// POST /api/student/questions/practice
async function postHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('grade');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // ─────────────────────────────────────────────────────────────────────────────
    // Mode A: Check single question immediately during practice
    // ─────────────────────────────────────────────────────────────────────────────
    if (action === 'check_single') {
        const { questionId, selectedChoiceIndex, essayAnswer } = body;

        if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
            return NextResponse.json({ success: false, message: 'معرف السؤال غير صحيح' }, { status: 400 });
        }

        const question = await Question.findOne({
            _id: questionId,
            isActive: true,
        }).lean() as any;

        if (!question) {
            return NextResponse.json({ success: false, message: 'السؤال غير متاح' }, { status: 404 });
        }

        if (question.type === 'essay') {
            return NextResponse.json({
                success: true,
                data: {
                    isCorrect: true,
                    type: 'essay',
                    studentAnswer: essayAnswer || '',
                    modelAnswer: question.modelAnswer || 'لا توجد إجابة نموذجية مسجلة لهذا السؤال',
                    gradingCriteria: question.gradingCriteria || '',
                    explanation: question.explanation || '',
                    points: question.points,
                },
            });
        }

        const choices = question.choices || [];
        const correctChoiceIndex = choices.findIndex((c: any) => c.isCorrect);
        const correctChoiceText = choices[correctChoiceIndex]?.text || '';
        const isCorrect = Number(selectedChoiceIndex) === correctChoiceIndex;

        return NextResponse.json({
            success: true,
            data: {
                isCorrect,
                type: question.type,
                selectedChoiceIndex,
                correctChoiceIndex,
                correctAnswer: correctChoiceText,
                explanation: question.explanation || '',
                pointsEarned: isCorrect ? question.points : 0,
                maxPoints: question.points,
            },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Mode B: Submit complete practice session
    // ─────────────────────────────────────────────────────────────────────────────
    if (action === 'submit_session') {
        const { answers, timeSpent, attemptId } = body;

        if (!Array.isArray(answers) || answers.length === 0) {
            return NextResponse.json({ success: false, message: 'لا توجد إجابات مرسلة' }, { status: 400 });
        }

        // Prevent duplicate submissions if attemptId was already recorded
        if (attemptId && mongoose.Types.ObjectId.isValid(attemptId)) {
            const existing = await ExamAttempt.findOne({
                _id: attemptId,
                student: student.userId,
            });
            if (existing) {
                return NextResponse.json({
                    success: false,
                    message: 'تم تسجيل هذه المحاولة مسبقاً',
                }, { status: 400 });
            }
        }

        const questionIds = answers
            .map((a: any) => a.questionId)
            .filter((id: any) => mongoose.Types.ObjectId.isValid(id));

        const questions = await Question.find({
            _id: { $in: questionIds },
            isActive: true,
        }).lean() as any[];

        const questionMap = new Map<string, any>(questions.map((q) => [q._id.toString(), q]));

        let score = 0;
        let totalPoints = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;
        let hasUngradedEssays = false;

        const answerRecords: any[] = [];
        const reviewList: any[] = [];

        for (const ans of answers) {
            const q = questionMap.get(ans.questionId);
            if (!q) continue;

            const qType = q.type;
            const qPts = q.points || 1;
            totalPoints += qPts;

            if (qType === 'essay') {
                const writtenText = (ans.essayAnswer || '').trim();
                hasUngradedEssays = true;
                if (!writtenText) {
                    unansweredCount++;
                }

                answerRecords.push({
                    questionId: q._id,
                    selectedChoiceIndex: -1,
                    isCorrect: false,
                    pointsEarned: 0,
                    essayAnswer: writtenText,
                    gradingStatus: 'pending',
                });

                reviewList.push({
                    questionId: q._id.toString(),
                    text: q.text,
                    type: 'essay',
                    points: qPts,
                    pointsEarned: 0,
                    status: writtenText ? 'essay_submitted' : 'unanswered',
                    studentAnswer: writtenText,
                    modelAnswer: q.modelAnswer || 'تتطلب مراجعة المعلم',
                    gradingCriteria: q.gradingCriteria || '',
                    explanation: q.explanation || '',
                });
            } else {
                const selectedIdx = ans.selectedChoiceIndex !== undefined && ans.selectedChoiceIndex !== null
                    ? Number(ans.selectedChoiceIndex)
                    : -1;
                const choices = q.choices || [];
                const correctIdx = choices.findIndex((c: any) => c.isCorrect);
                const correctChoiceText = choices[correctIdx]?.text || '';
                const studentChoiceText = selectedIdx >= 0 && selectedIdx < choices.length ? choices[selectedIdx]?.text : '';

                const isAnswered = selectedIdx >= 0;
                const isCorrect = isAnswered && selectedIdx === correctIdx;
                const pointsEarned = isCorrect ? qPts : 0;

                score += pointsEarned;
                if (!isAnswered) unansweredCount++;
                else if (isCorrect) correctCount++;
                else wrongCount++;

                answerRecords.push({
                    questionId: q._id,
                    selectedChoiceIndex: selectedIdx,
                    isCorrect,
                    pointsEarned,
                    gradingStatus: 'graded',
                });

                reviewList.push({
                    questionId: q._id.toString(),
                    text: q.text,
                    type: qType,
                    choices: choices.map((c: any) => ({ text: c.text, isCorrect: c.isCorrect })),
                    points: qPts,
                    pointsEarned,
                    status: !isAnswered ? 'unanswered' : isCorrect ? 'correct' : 'wrong',
                    selectedChoiceIndex: selectedIdx,
                    studentAnswer: studentChoiceText,
                    correctChoiceIndex: correctIdx,
                    correctAnswer: correctChoiceText,
                    explanation: q.explanation || '',
                });
            }
        }

        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
        const passed = percentage >= 50;
        const now = new Date();

        // Create practice attempt in DB
        const attempt = await ExamAttempt.create({
            student: student.userId,
            examType: 'practice',
            status: 'submitted',
            answers: answerRecords,
            score,
            totalPoints,
            percentage,
            passed,
            pointsAwarded: false,
            earnedPoints: 5, // Reward 5 gamification points for completing a practice session
            hasUngradedEssays,
            startedAt: new Date(now.getTime() - ((timeSpent || 60) * 1000)),
            submittedAt: now,
            timeSpent: timeSpent || 60,
            attemptNumber: 1,
        });

        // Award reward points for completing practice
        awardPoints({
            studentId: student.userId,
            amount: 5,
            type: 'task_completion',
            reason: `جلسة تدريب على بنك الأسئلة - ${percentage}%`,
            referenceId: attempt._id.toString(),
            referenceType: 'ExamAttempt',
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            message: 'تم تسليم جلسة التدريب وحفظ النتيجة',
            data: {
                attemptId: attempt._id.toString(),
                score,
                totalPoints,
                percentage,
                passed,
                correctCount,
                wrongCount,
                unansweredCount,
                totalQuestions: questionIds.length,
                timeSpent: timeSpent || 60,
                hasUngradedEssays,
                review: reviewList,
            },
        });
    }

    return NextResponse.json({ success: false, message: 'إجراء غير معروف' }, { status: 400 });
}

// GET /api/student/questions/practice - get student's recent practice sessions summary
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const attempts = await ExamAttempt.find({
        student: student.userId,
        examType: 'practice',
        status: 'submitted',
    })
        .select('score totalPoints percentage submittedAt timeSpent answers')
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();

    const totalPracticeAttempts = await ExamAttempt.countDocuments({
        student: student.userId,
        examType: 'practice',
        status: 'submitted',
    });

    return NextResponse.json({
        success: true,
        data: {
            attempts,
            totalPracticeAttempts,
        },
    });
}

export const POST = withStudent(postHandler);
export const GET = withStudent(getHandler);
