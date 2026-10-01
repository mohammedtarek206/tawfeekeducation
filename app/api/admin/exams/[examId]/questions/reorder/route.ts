import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// PUT: تحديث ترتيب الأسئلة
async function putHandler(req: NextRequest, ctx: any, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const { examId } = ctx.params;

    const exam = await Exam.findById(examId);
    if (!exam) return NextResponse.json({ success: false, message: 'الامتحان غير موجود' }, { status: 404 });

    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ success: false, message: 'بيانات غير صحيحة' }, { status: 400 });
    }

    try {
        const bulkOps = orderedIds.map((id: string, index: number) => ({
            updateOne: {
                filter: { _id: id, examId },
                update: { $set: { order: index } }
            }
        }));

        if (bulkOps.length > 0) {
            await Question.bulkWrite(bulkOps);

            // Also update the order of questions in the Exam model
            exam.questions = orderedIds;
            await exam.save();
        }

        return NextResponse.json({ success: true, message: 'تم تحديث الترتيب' });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message || 'حدث خطأ' }, { status: 500 });
    }
}

export const PUT = withAdmin(putHandler);
