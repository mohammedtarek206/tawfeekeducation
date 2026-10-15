import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

// DELETE /api/admin/questions/[id]
async function deleteHandler(
    req: NextRequest,
    context: any,
    _admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        // Extract ID from URL path directly (reliable across Next.js versions)
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

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
    } catch (err) {
        console.error('Error deleting question:', err);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ أثناء حذف السؤال' },
            { status: 500 }
        );
    }
}

export const DELETE = withAdmin(deleteHandler);
