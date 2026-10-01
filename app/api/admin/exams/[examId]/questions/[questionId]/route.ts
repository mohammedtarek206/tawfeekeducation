import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

// PUT: تعديل السؤال
async function putHandler(req: NextRequest, ctx: any, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const { examId, questionId } = ctx.params;

    const exam = await Exam.findById(examId);
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    const question = await Question.findById(questionId);
    if (!question || question.examId?.toString() !== examId) {
        return NextResponse.json({ success: false, message: 'السؤال غير موجود' }, { status: 404 });
    }

    const body = await req.json();

    // Validation
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
            correctAnswer = choices.find((c: any) => c.isCorrect)?.text;
        }

        // Calculate diff in points for exam totalPoints
        const pointsDiff = points - question.points;

        question.text = body.text;
        question.type = body.type;
        question.choices = choices;
        question.correctAnswer = correctAnswer;
        question.explanation = body.explanation;
        question.image = body.image;
        question.points = points;

        if (body.order !== undefined) question.order = body.order;

        await question.save();

        if (pointsDiff !== 0) {
            exam.totalPoints = (exam.totalPoints || 0) + pointsDiff;
            await exam.save();
        }

        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: 'QUESTION_UPDATED',
            target: question._id.toString(),
            targetModel: 'Question',
            metadata: { examId: exam._id, text: question.text }
        });

        return NextResponse.json({ success: true, message: 'تم تعديل السؤال بنجاح', data: { question } });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message || 'حدث خطأ' }, { status: 500 });
    }
}

// DELETE: حذف (أرشفة) السؤال
async function deleteHandler(req: NextRequest, ctx: any, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const { examId, questionId } = ctx.params;

    const exam = await Exam.findById(examId);
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    const question = await Question.findById(questionId);
    if (!question || question.examId?.toString() !== examId) {
        return NextResponse.json({ success: false, message: 'السؤال غير موجود' }, { status: 404 });
    }

    try {
        // Soft delete: set isActive to false and remove from exam's questions array
        question.isActive = false;
        await question.save();

        exam.questions = exam.questions.filter((qId: any) => qId.toString() !== questionId);
        exam.totalPoints = Math.max(0, (exam.totalPoints || 0) - question.points);
        await exam.save();

        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: 'QUESTION_DELETED',
            target: question._id.toString(),
            targetModel: 'Question',
            metadata: { examId: exam._id }
        });

        return NextResponse.json({ success: true, message: 'تم حذف السؤال بنجاح' });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message || 'حدث خطأ' }, { status: 500 });
    }
}

export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
