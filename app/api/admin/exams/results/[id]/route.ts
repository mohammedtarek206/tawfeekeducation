import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Question from '@/lib/db/models/Question';
import Exam from '@/lib/db/models/Exam';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import { checkAndAwardAchievements } from '@/lib/utils/achievements';
import mongoose from 'mongoose';

// GET /api/admin/exams/results/[id] - fetch detailed attempt with questions and answers
async function getHandler(req: NextRequest, ctx: any, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const attemptId = ctx.params.id;

    if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
        return NextResponse.json({ success: false, message: 'معرف المحاولة غير صالح' }, { status: 400 });
    }

    const attempt = await ExamAttempt.findById(attemptId)
        .populate('student', 'name phone grade')
        .populate('examRef')
        .lean() as any;

    if (!attempt) {
        return NextResponse.json({ success: false, message: 'المحاولة غير موجودة' }, { status: 404 });
    }

    // Load all questions in this attempt
    const questionIds = (attempt.answers || []).map((a: any) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean() as any[];
    const questionMap = new Map<string, any>(questions.map((q) => [q._id.toString(), q]));

    // Build enriched answers list
    const enrichedAnswers = (attempt.answers || []).map((ans: any) => {
        const q = questionMap.get(ans.questionId.toString());
        return {
            ...ans,
            questionText: q?.text || 'السؤال غير متوفر',
            questionType: q?.type || 'mcq',
            choices: q?.choices || [],
            maxPoints: q?.points || 1,
            modelAnswer: q?.modelAnswer,
            gradingCriteria: q?.gradingCriteria,
            explanation: q?.explanation,
            image: q?.image,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            attempt: {
                ...attempt,
                answers: enrichedAnswers,
            },
        },
    });
}

// POST /api/admin/exams/results/[id] - grade essay answer or adjust points
async function postHandler(req: NextRequest, ctx: any, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const attemptId = ctx.params.id;

    if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
        return NextResponse.json({ success: false, message: 'معرف المحاولة غير صالح' }, { status: 400 });
    }

    const body = await req.json();
    const { questionId, pointsEarned, gradingNotes } = body;

    if (!questionId || pointsEarned === undefined) {
        return NextResponse.json({ success: false, message: 'بيانات ناقصة: questionId و pointsEarned مطلوبة' }, { status: 400 });
    }

    const pts = Number(pointsEarned);
    if (isNaN(pts) || pts < 0) {
        return NextResponse.json({ success: false, message: 'الدرجة يجب أن تكون صفر أو أكثر' }, { status: 400 });
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
        return NextResponse.json({ success: false, message: 'المحاولة غير موجودة' }, { status: 404 });
    }

    // Verify question max points
    const question = await Question.findById(questionId).select('points type');
    if (!question) {
        return NextResponse.json({ success: false, message: 'السؤال غير موجود' }, { status: 404 });
    }

    if (pts > question.points) {
        return NextResponse.json(
            { success: false, message: `الدرجة المدخلة (${pts}) تتجاوز الحد الأقصى للسؤال (${question.points})` },
            { status: 400 }
        );
    }

    // Update specific answer in attempt
    await ExamAttempt.updateOne(
        { _id: attemptId, 'answers.questionId': new mongoose.Types.ObjectId(questionId) },
        {
            $set: {
                'answers.$.pointsEarned': pts,
                'answers.$.gradingStatus': 'graded',
                'answers.$.isCorrect': pts > 0,
                'answers.$.gradedBy': new mongoose.Types.ObjectId(admin.userId),
                'answers.$.gradedAt': new Date(),
                'answers.$.gradingNotes': gradingNotes || '',
            },
        }
    );

    // Recalculate totals
    const updated = await ExamAttempt.findById(attemptId);
    if (!updated) {
        return NextResponse.json({ success: false, message: 'فشل في تحديث المحاولة' }, { status: 500 });
    }

    const newScore = updated.answers.reduce((sum: number, a: any) => sum + (a.pointsEarned || 0), 0);
    const stillPending = updated.answers.some((a: any) => a.gradingStatus === 'pending');
    const total = updated.totalPoints || newScore;
    const percentage = total > 0 ? Math.round((newScore / total) * 100) : 0;

    let passingScore = 50;
    if (updated.examRef) {
        const exam = await Exam.findById(updated.examRef).select('passingScore').lean() as any;
        if (exam?.passingScore !== undefined) passingScore = exam.passingScore;
    }

    const passed = !stillPending && percentage >= passingScore;

    await ExamAttempt.findByIdAndUpdate(attemptId, {
        score: newScore,
        percentage,
        passed,
        hasUngradedEssays: stillPending,
    });

    // Award gamification points once all essays are graded
    if (!stillPending && !updated.pointsAwarded && updated.examRef) {
        const examType = updated.examType;
        const pointsMultiplier = examType === 'monthly_exam' ? 100 : examType === 'weekly_exam' ? 50 : 10;
        const earnedPoints = Math.round(pointsMultiplier * (percentage / 100));

        if (earnedPoints > 0) {
            const alreadyRewarded = await ExamAttempt.findOne({
                student: updated.student,
                examRef: updated.examRef,
                pointsAwarded: true,
            });

            if (!alreadyRewarded) {
                await awardPoints({
                    studentId: updated.student.toString(),
                    amount: earnedPoints,
                    type: 'exam_completed',
                    reason: `${examType === 'monthly_exam' ? 'امتحان شهري' : 'امتحان'} - ${percentage}% (بعد التصحيح)`,
                    referenceId: updated.examRef.toString(),
                    referenceType: 'Exam',
                }).catch(() => {});
                await ExamAttempt.findByIdAndUpdate(attemptId, { pointsAwarded: true, earnedPoints });
                checkAndAwardAchievements(updated.student.toString()).catch(() => {});
            }
        }
    }

    return NextResponse.json({
        success: true,
        message: 'تم تصحيح الإجابة وتحديث النتيجة بنجاح',
        data: {
            newScore,
            percentage,
            passed,
            hasUngradedEssays: stillPending,
        },
    });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
