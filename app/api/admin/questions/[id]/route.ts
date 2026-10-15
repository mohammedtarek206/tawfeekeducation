import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

// DELETE /api/admin/questions/[id]
async function deleteHandler(
    req: NextRequest,
    context: { params: { id: string } },
    _admin: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const { id } = context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
            { success: false, message: 'معرف السؤال غير صالح' },
            { status: 400 }
        );
    }

    const question = await Question.findById(id);
    if (!question) {
        return NextResponse.json(
            { success: false, message: 'السؤال غير موجود' },
            { status: 404 }
        );
    }

    await Question.findByIdAndDelete(id);

    return NextResponse.json({
        success: true,
        message: 'تم حذف السؤال بنجاح',
    });
}

export const DELETE = withAdmin(deleteHandler);
