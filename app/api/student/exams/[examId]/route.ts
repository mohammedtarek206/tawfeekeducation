import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import Question from '@/lib/db/models/Question';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/student/exams/[examId] - get exam with questions (choices without isCorrect)
async function getHandler(
    req: NextRequest,
    ctx: any,
    student: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const examId = ctx.params.examId;
    const studentUser = await User.findById(student.userId).select('grade subscriptionStatus subscriptionEndDate');
    if (!studentUser) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });

    const filter: Record<string, any> = { _id: examId, isPublished: true };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        filter.grade = studentUser.grade;
    }
    const exam: any = await Exam.findOne(filter).lean();
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    // Validate Subscription
    if (!exam.isFree) {
        if (studentUser.subscriptionStatus !== 'active' || (studentUser.subscriptionEndDate && new Date() > new Date(studentUser.subscriptionEndDate))) {
            return NextResponse.json({ success: false, message: 'هذا المحتوى مدفوع، يرجى الاشتراك للوصول إليه', requireSubscription: true }, { status: 403 });
        }
    }

    // Fetch questions WITHOUT exposing isCorrect
    const questions = await Question.find({ _id: { $in: exam.questions || [] } })
        .select('text type choices difficulty points image order')
        .sort({ order: 1 })
        .lean();

    // Strip isCorrect from choices
    const safeQuestions = questions.map((q) => ({
        ...q,
        choices: (q.choices as Array<{ text: string; isCorrect: boolean }>).map(({ text }) => ({ text })),
    }));

    return NextResponse.json({
        success: true,
        data: { exam: { ...exam, questions: safeQuestions } },
    });
}

export const GET = withStudent(getHandler);
