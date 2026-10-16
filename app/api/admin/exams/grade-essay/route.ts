import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import { checkAndAwardAchievements } from '@/lib/utils/achievements';
import mongoose from 'mongoose';

/**
 * POST /api/admin/exams/grade-essay
 * Admin grades a specific essay answer within an exam attempt.
 *
 * Body: { attemptId, questionId, pointsEarned, gradingNotes? }
 */
async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { attemptId, questionId, pointsEarned, gradingNotes } = body;

    if (!attemptId || !questionId || pointsEarned === undefined) {
        return NextResponse.json({ success: false, message: 'بيانات ناقصة: attemptId و questionId و pointsEarned مطلوبة' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId) || !mongoose.Types.ObjectId.isValid(questionId)) {
        return NextResponse.json({ success: false, message: 'معرّف غير صحيح' }, { status: 400 });
    }

    const pts = Number(pointsEarned);
    if (isNaN(pts) || pts < 0) {
        return NextResponse.json({ success: false, message: 'الدرجة يجب أن تكون صفر أو أكثر' }, { status: 400 });
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
        return NextResponse.json({ success: false, message: 'المحاولة غير موجودة' }, { status: 404 });
    }
    if (attempt.status !== 'submitted') {
        return NextResponse.json({ success: false, message: 'لا يمكن تصحيح محاولة غير مكتملة' }, { status: 400 });
    }

    // Find the answer record for this question
    const answerRecord = attempt.answers.find(
        (a: any) => a.questionId.toString() === questionId
    );

    if (!answerRecord) {
        return NextResponse.json({ success: false, message: 'الإجابة غير موجودة في هذه المحاولة' }, { status: 404 });
    }

    if ((answerRecord as any).gradingStatus === 'graded' && (answerRecord as any).pointsEarned > 0) {
        // Allow re-grading: admin can adjust the grade
    }

    // Get the question to validate max points
    const Question = (await import('@/lib/db/models/Question')).default;
    const question = await Question.findById(questionId).select('points type');
    if (!question) {
        return NextResponse.json({ success: false, message: 'السؤال غير موجود' }, { status: 404 });
    }

    if (pts > question.points) {
        return NextResponse.json(
            { success: false, message: `الدرجة المدخلة (${pts}) تتجاوز الدرجة الكاملة للسؤال (${question.points})` },
            { status: 400 }
        );
    }

    // Adjust score: remove old pointsEarned for this answer, add new
    const oldPoints = (answerRecord as any).pointsEarned || 0;

    // Update the specific answer subdocument
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
            }
        }
    );

    // Recalculate attempt totals
    const updatedAttempt = await ExamAttempt.findById(attemptId);
    if (!updatedAttempt) {
        return NextResponse.json({ success: false, message: 'خطأ في تحديث المحاولة' }, { status: 500 });
    }

    const newScore = updatedAttempt.answers.reduce((sum: number, a: any) => sum + (a.pointsEarned || 0), 0);
    const stillPending = updatedAttempt.answers.some((a: any) => a.gradingStatus === 'pending');

    // Use totalPoints from attempt (set at submission time)
    const total = updatedAttempt.totalPoints || newScore;
    const percentage = total > 0 ? Math.round((newScore / total) * 100) : 0;

    // Load exam for passing score
    const Exam = (await import('@/lib/db/models/Exam')).default;
    const exam = await Exam.findById(updatedAttempt.examRef).select('passingScore').lean() as any;
    const passingScore = exam?.passingScore ?? 50;
    const passed = !stillPending && percentage >= passingScore;

    await ExamAttempt.findByIdAndUpdate(attemptId, {
        score: newScore,
        percentage,
        passed,
        hasUngradedEssays: stillPending,
    });

    // Award gamification points once all essays are graded
    if (!stillPending && !updatedAttempt.pointsAwarded) {
        const examType = updatedAttempt.examType;
        const pointsMultiplier = examType === 'monthly_exam' ? 100 : examType === 'weekly_exam' ? 50 : 10;
        const earnedPoints = Math.round(pointsMultiplier * (percentage / 100));

        if (earnedPoints > 0) {
            const alreadyRewarded = await ExamAttempt.findOne({
                student: updatedAttempt.student,
                examRef: updatedAttempt.examRef,
                pointsAwarded: true,
            });

            if (!alreadyRewarded) {
                await awardPoints({
                    studentId: updatedAttempt.student.toString(),
                    amount: earnedPoints,
                    type: 'exam_completed',
                    reason: `${examType === 'monthly_exam' ? 'امتحان شهري' : examType === 'weekly_exam' ? 'امتحان أسبوعي' : 'كويز'} - ${percentage}% (بعد التصحيح)`,
                    referenceId: updatedAttempt.examRef.toString(),
                    referenceType: 'Exam',
                });
                await ExamAttempt.findByIdAndUpdate(attemptId, { pointsAwarded: true, earnedPoints });
                checkAndAwardAchievements(updatedAttempt.student.toString()).catch(() => { });
            }
        }
    }

    return NextResponse.json({
        success: true,
        message: 'تم تصحيح الإجابة بنجاح',
        data: {
            newScore,
            percentage,
            passed,
            hasUngradedEssays: stillPending,
        }
    });
}

/**
 * GET /api/admin/exams/grade-essay?examId=xxx
 * Returns all submitted attempts for an exam that have pending essay answers.
 */
async function getHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
        return NextResponse.json({ success: false, message: 'examId مطلوب' }, { status: 400 });
    }

    const attempts = await ExamAttempt.find({
        examRef: new mongoose.Types.ObjectId(examId),
        status: 'submitted',
    })
        .populate('student', 'name phone grade')
        .sort({ submittedAt: -1 })
        .lean();

    return NextResponse.json({ success: true, data: { attempts } });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
