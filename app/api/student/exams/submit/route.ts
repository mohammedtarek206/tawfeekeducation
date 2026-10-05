import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Question from '@/lib/db/models/Question';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import { checkAndAwardAchievements } from '@/lib/utils/achievements';
import mongoose from 'mongoose';

// POST /api/student/exams/submit - submit exam answers
async function postHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { examId, examType, answers } = body; // answers: { questionId, selectedChoiceIndex }[]

    if (!examId || !examType || !answers) {
        return NextResponse.json({ success: false, message: 'بيانات ناقصة' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(examId)) {
        return NextResponse.json({ success: false, message: 'معرف غير صحيح' }, { status: 400 });
    }

    // Validate exam exists and is active
    const exam = await Exam.findOne({
        _id: examId,
        isPublished: true,
    }).populate('questions');

    if (!exam) {
        return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });
    }

    // Check exam time window
    const now = new Date();
    if (exam.endDate && exam.endDate < now) {
        return NextResponse.json(
            { success: false, message: 'انتهى وقت الامتحان، لا يمكن التقديم' },
            { status: 400 }
        );
    }

    // Check student's grade and subscription
    const studentUser = await User.findById(student.userId).select('grade subscriptionStatus subscriptionEndDate');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });
    }
    if (exam.grade !== studentUser.grade) {
        return NextResponse.json({ success: false, message: 'هذا الامتحان ليس لصفك الدراسي' }, { status: 403 });
    }

    if (!exam.isFree) {
        if (studentUser.subscriptionStatus !== 'active' || (studentUser.subscriptionEndDate && new Date() > new Date(studentUser.subscriptionEndDate))) {
            return NextResponse.json({ success: false, message: 'هذا المحتوى مدفوع، يرجى الاشتراك للوصول إليه' }, { status: 403 });
        }
    }

    // Check attempt limit
    const attemptCount = await ExamAttempt.countDocuments({
        student: student.userId,
        examRef: examId,
        status: 'submitted',
    });

    if (attemptCount >= exam.maxAttempts) {
        return NextResponse.json(
            { success: false, message: 'لقد استنفدت عدد المحاولات المسموحة' },
            { status: 400 }
        );
    }

    // SERVER-SIDE SCORING - never trust frontend
    const questions = exam.questions as unknown as { _id: mongoose.Types.ObjectId }[];
    const fullQuestions = await Question.find({ _id: { $in: questions.map((q) => q._id) } });

    let score = 0;
    const answerRecords = [];

    for (const answer of answers) {
        const question = fullQuestions.find((q) => q._id.toString() === answer.questionId);
        if (!question) continue;

        const selectedChoice = (question as unknown as { choices: Array<{ isCorrect: boolean }> }).choices[answer.selectedChoiceIndex];
        const isCorrect = selectedChoice?.isCorrect || false;
        const pointsEarned = isCorrect ? question.points : 0;
        score += pointsEarned;

        answerRecords.push({
            questionId: answer.questionId,
            selectedChoiceIndex: answer.selectedChoiceIndex,
            isCorrect,
            pointsEarned,
        });
    }

    const totalPoints = fullQuestions.reduce((sum, q) => sum + q.points, 0);
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= exam.passingScore;

    // Determine points earned
    const pointsMultiplier = examType === 'monthly_exam' ? 100 : examType === 'weekly_exam' ? 50 : 10;
    const basePoints = parseInt(process.env[`DEFAULT_${examType.toUpperCase()}_POINTS`] || String(pointsMultiplier));
    const earnedPoints = Math.round(basePoints * (percentage / 100));

    // Create attempt record
    const attempt = await ExamAttempt.create({
        student: student.userId,
        examRef: examId,
        examType,
        status: 'submitted',
        answers: answerRecords,
        score,
        totalPoints,
        percentage,
        passed,
        pointsAwarded: false,
        earnedPoints,
        submittedAt: now,
        attemptNumber: attemptCount + 1,
        serverEndTime: new Date(now.getTime() + exam.duration * 60 * 1000),
    });

    // Award points (only if not already awarded for this exam)
    if (earnedPoints > 0) {
        const alreadyRewarded = await ExamAttempt.findOne({
            student: student.userId,
            examRef: examId,
            pointsAwarded: true,
        });

        if (!alreadyRewarded) {
            await awardPoints({
                studentId: student.userId,
                amount: earnedPoints,
                type: 'exam_completed',
                reason: `${examType === 'monthly_exam' ? 'امتحان شهري' : examType === 'weekly_exam' ? 'امتحان أسبوعي' : 'كويز'} - ${percentage}%`,
                referenceId: examId,
                referenceType: 'Exam',
            });

            await ExamAttempt.findByIdAndUpdate(attempt._id, { pointsAwarded: true });
            // Fire achievement check (non-blocking)
            checkAndAwardAchievements(student.userId).catch(() => { });
        }
    }

    return NextResponse.json({
        success: true,
        data: {
            attemptId: attempt._id,
            score,
            totalPoints,
            percentage,
            passed,
            earnedPoints,
            correctAnswers: answerRecords.filter((a) => a.isCorrect).length,
            totalQuestions: fullQuestions.length,
        },
    });
}

export const POST = withStudent(postHandler);
