import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import Question from '@/lib/db/models/Question';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';

// GET /api/student/exams/[examId] - get exam with questions (choices without isCorrect)
async function getHandler(
    req: NextRequest,
    ctx: any,
    studentPayload: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const examId = ctx.params.examId;
    const studentUser = await User.findById(studentPayload.userId).select('grade status subscriptionStatus subscriptionEndDate').lean() as any;
    if (!studentUser) return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 403 });

    const filter: Record<string, any> = { _id: examId, isPublished: true };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        filter.grade = studentUser.grade;
    }
    const exam: any = await Exam.findOne(filter).lean();
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    // Enforce robust server-side subscription access control
    const access = await checkStudentAccess(studentPayload.userId, {
        grade: studentUser.grade,
        isFreeContent: exam.isFree,
    });

    if (!access.canAccess) {
        return NextResponse.json(
            {
                success: false,
                message:
                    access.reason === 'pending_approval'
                        ? 'حسابك ما زال قيد المراجعة من الإدارة'
                        : access.reason === 'subscription_expired'
                            ? 'انتهى اشتراكك، يرجى التجديد للوصول إلى هذا الاختبار'
                            : 'هذا الاختبار متاح للمشتركين فقط، يرجى الاشتراك للوصول إليه',
                reason: access.reason,
                requireSubscription: true,
            },
            { status: 403 }
        );
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

