import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/points/reset-all
 * Retrieves preview statistics of students whose points will be reset
 */
async function getHandler(_req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    try {
        await connectDB();

        const [stats] = await User.aggregate([
            { $match: { role: 'student', points: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    affectedStudentsCount: { $sum: 1 },
                    totalPointsToReset: { $sum: '$points' },
                },
            },
        ]);

        return NextResponse.json({
            success: true,
            data: {
                affectedStudentsCount: stats?.affectedStudentsCount || 0,
                totalPointsToReset: stats?.totalPointsToReset || 0,
            },
        });
    } catch (err: any) {
        console.error('Error fetching bulk reset stats:', err);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ أثناء استعلام بيانات التصفير الشامل' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/points/reset-all
 * Safely resets points for ALL students with points > 0, recording ledger transactions and audit log
 */
async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    try {
        await connectDB();

        let body: any = {};
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, message: 'طلب غير صالح' }, { status: 400 });
        }

        const { confirmationPhrase, reason, requestId } = body;

        // 1. Strict Confirmation Phrase Check
        const requiredPhrase = 'تصفير جميع النقاط';
        if (!confirmationPhrase || String(confirmationPhrase).trim() !== requiredPhrase) {
            return NextResponse.json(
                {
                    success: false,
                    message: `يرجى كتابة عبارة التأكيد المطلوبة بالضبط: "${requiredPhrase}" لتفعيل التصفير الشامل`,
                },
                { status: 400 }
            );
        }

        // 2. Reason Validation
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason || trimmedReason.length < 3) {
            return NextResponse.json(
                { success: false, message: 'يجب كتابة سبب التصفير الشامل (3 أحرف على الأقل)' },
                { status: 400 }
            );
        }

        // 3. Idempotency Check (prevent duplicate execution on network retry or double click)
        if (requestId) {
            const alreadyLogged = await AuditLog.findOne({
                'metadata.requestId': requestId,
                'metadata.operationType': 'bulk_reset',
            }).lean();

            if (alreadyLogged) {
                return NextResponse.json({
                    success: true,
                    message: 'تم تنفيذ عملية التصفير الشامل مسبقاً',
                    data: {
                        alreadyProcessed: true,
                        operationId: (alreadyLogged as any).metadata?.operationId,
                    },
                });
            }
        }

        // 4. Fetch Target Students (only students with points > 0)
        const targetStudents = (await User.find({
            role: 'student',
            points: { $gt: 0 },
        })
            .select('_id name points level')
            .lean()) as any[];

        if (!targetStudents || targetStudents.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'لا يوجد أي طالب لديه نقاط حالياً لتصفيرها (جميع أرصدة الطلاب صفر)',
                data: {
                    affectedCount: 0,
                    failedCount: 0,
                    totalDeducted: 0,
                    status: 'completed',
                },
            });
        }

        const operationId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transactionReason = `[تصفير شامل لجميع الطلاب] ${trimmedReason}`;

        let processedCount = 0;
        let totalDeducted = 0;
        const failures: Array<{ studentId: string; name: string; error: string }> = [];

        // 5. Process each student safely
        for (const student of targetStudents) {
            try {
                const pointsBefore = student.points || 0;
                if (pointsBefore <= 0) continue;

                // Atomic balance reset to 0 and level to 1
                const updated = await User.findOneAndUpdate(
                    { _id: student._id, role: 'student' },
                    { $set: { points: 0, level: 1 } },
                    { new: true }
                );

                if (!updated) {
                    failures.push({
                        studentId: String(student._id),
                        name: student.name,
                        error: 'تعذر تحديث سجل الطالب في قاعدة البيانات',
                    });
                    continue;
                }

                // Add corrective ledger transaction to maintain complete historical ledger
                await PointTransaction.create({
                    student: student._id,
                    amount: -pointsBefore,
                    type: 'admin_adjustment',
                    reason: transactionReason,
                    balanceAfter: 0,
                    createdBy: admin.userId,
                    referenceType: `bulk_reset:${operationId}`,
                });

                processedCount++;
                totalDeducted += pointsBefore;
            } catch (err: any) {
                console.error(`Failed to reset points for student ${student._id}:`, err);
                failures.push({
                    studentId: String(student._id),
                    name: student.name,
                    error: err.message || 'خطأ غير متوقع',
                });
            }
        }

        const isFullySuccessful = failures.length === 0;

        // 6. Record Audit Log for the Bulk Operation
        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: AUDIT_ACTIONS.POINTS_RESET,
            targetModel: 'User',
            metadata: {
                operationId,
                operationType: 'bulk_reset',
                affectedCount: processedCount,
                failedCount: failures.length,
                totalPointsRemoved: totalDeducted,
                reason: trimmedReason,
                requestId: requestId || null,
                status: isFullySuccessful ? 'completed' : 'partial',
                failures: failures.length > 0 ? failures.slice(0, 10) : [],
            },
        });

        const resultMessage = isFullySuccessful
            ? `تم تصفير نقاط جميع الطلاب المستهدفين بنجاح (${processedCount} طالب بإجمالي ${totalDeducted.toLocaleString()} نقطة)`
            : `تمت معالجة تصفير نقاط ${processedCount} طالب بنجاح، مع تعذر معالجة ${failures.length} طالب`;

        return NextResponse.json({
            success: isFullySuccessful || processedCount > 0,
            message: resultMessage,
            data: {
                operationId,
                affectedCount: processedCount,
                failedCount: failures.length,
                totalDeducted,
                status: isFullySuccessful ? 'completed' : 'partial',
                failures: failures.length > 0 ? failures : undefined,
            },
        });
    } catch (err: any) {
        console.error('Bulk reset handler error:', err);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ في الخادم أثناء تنفيذ التصفير الشامل للنقاط' },
            { status: 500 }
        );
    }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
