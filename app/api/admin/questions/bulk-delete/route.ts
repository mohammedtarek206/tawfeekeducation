import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

// DELETE /api/admin/questions/bulk-delete
// Body: { ids: string[] }
async function bulkDeleteHandler(
    req: NextRequest,
    _context: unknown,
    _admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        const body = await req.json();
        const { ids } = body;

        // Validate input
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, message: 'يجب تحديد معرفات الأسئلة المراد حذفها' },
                { status: 400 }
            );
        }

        if (ids.length > 500) {
            return NextResponse.json(
                { success: false, message: 'لا يمكن حذف أكثر من 500 سؤال في وقت واحد' },
                { status: 400 }
            );
        }

        // Validate all IDs are valid ObjectIds
        const validIds: mongoose.Types.ObjectId[] = [];
        const invalidIds: string[] = [];

        for (const id of ids) {
            if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
                validIds.push(new mongoose.Types.ObjectId(id));
            } else {
                invalidIds.push(String(id));
            }
        }

        if (invalidIds.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `بعض المعرفات غير صالحة: ${invalidIds.slice(0, 5).join(', ')}`,
                },
                { status: 400 }
            );
        }

        if (validIds.length === 0) {
            return NextResponse.json(
                { success: false, message: 'لا توجد معرفات صالحة للحذف' },
                { status: 400 }
            );
        }

        // Execute bulk delete — only the specified IDs
        const result = await Question.deleteMany({
            _id: { $in: validIds },
        });

        const deletedCount = result.deletedCount ?? 0;

        if (deletedCount === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'لم يتم حذف أي سؤال — قد تكون الأسئلة غير موجودة مسبقاً',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `تم حذف ${deletedCount} سؤال بنجاح`,
            data: {
                deletedCount,
                requestedCount: validIds.length,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[bulk-delete questions] error:', message);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ في الخادم أثناء الحذف الجماعي' },
            { status: 500 }
        );
    }
}

export const DELETE = withAdmin(bulkDeleteHandler);
