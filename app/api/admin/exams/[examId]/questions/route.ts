import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

// GET: جلب جميع أسئلة هذا الامتحان
async function getHandler(req: NextRequest, ctx: any): Promise<NextResponse> {
    await connectDB();
    const examId = ctx.params.examId;

    const exam = await Exam.findById(examId);
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    const questions = await Question.find({ _id: { $in: exam.questions } })
        .sort({ order: 1 })
        .lean();

    return NextResponse.json({ success: true, data: { questions, exam } });
}

// POST: إضافة سؤال جديد للامتحان
async function postHandler(req: NextRequest, ctx: any, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const examId = ctx.params.examId;

    const exam = await Exam.findById(examId);
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    const body = await req.json();

    // Basic Validation
    if (!body.text || !body.type) {
        return NextResponse.json({ success: false, message: 'نص السؤال ونوعه مطلوبان' }, { status: 400 });
    }
    if (body.type === 'mcq' && (!body.choices || body.choices.length < 2)) {
        return NextResponse.json({ success: false, message: 'يجب إضافة اختيارين على الأقل' }, { status: 400 });
    }
    if (body.type === 'mcq' && !body.choices.some((c: any) => c.isCorrect)) {
        return NextResponse.json({ success: false, message: 'حدد الإجابة الصحيحة' }, { status: 400 });
    }
    if (body.type === 'true_false' && body.correctAnswer === undefined) {
        return NextResponse.json({ success: false, message: 'حدد الإجابة الصحيحة' }, { status: 400 });
    }

    const points = Number(body.points) || 1;
    if (points <= 0) return NextResponse.json({ success: false, message: 'الدرجة يجب أن تكون أكبر من صفر' }, { status: 400 });

    try {
        let choices = body.choices;
        let correctAnswer = body.correctAnswer;

        if (body.type === 'true_false') {
            choices = [
                { text: 'صح', isCorrect: correctAnswer === 'true' || correctAnswer === true },
                { text: 'خطأ', isCorrect: correctAnswer === 'false' || correctAnswer === false }
            ];
            correctAnswer = choices.find((c: any) => c.isCorrect)?.text;
        } else {
            // For MCQ, we'll store choices. correctAnswer string might be useful or just rely on isCorrect
            correctAnswer = choices.find((c: any) => c.isCorrect)?.text;
        }

        const newQuestion = await Question.create({
            text: body.text,
            type: body.type,
            choices,
            correctAnswer,
            explanation: body.explanation,
            image: body.image,
            points,
            order: body.order || 0,
            examId: exam._id,
            subject: exam.subject || 'uncategorized',
            grade: exam.grade,
            createdBy: admin.userId
        });

        // Add to Exam array and update totalPoints
        exam.questions.push(newQuestion._id);
        exam.totalPoints = (exam.totalPoints || 0) + points;
        await exam.save();

        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: 'QUESTION_CREATED',
            target: newQuestion._id.toString(),
            targetModel: 'Question',
            metadata: { examId: exam._id, text: newQuestion.text }
        });

        return NextResponse.json({ success: true, message: 'تم إضافة السؤال بنجاح', data: { question: newQuestion } }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message || 'حدث خطأ' }, { status: 500 });
    }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
