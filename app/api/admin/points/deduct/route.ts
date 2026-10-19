import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, message: 'طلب غير صالح' }, { status: 400 });
    }

    const {
        studentId,
        amount,
        reason,
        requestId,
        operationType = 'deduction', // 'deduction' | 'reset'
    } = body as {
        studentId?: string;
        amount?: unknown;
        reason?: string;
        requestId?: string;
        operationType?: 'deduction' | 'reset';
    };

    // --- Basic Validation ---
    if (!studentId) {
        return NextResponse.json(
            { success: false, message: 'معرف الطالب مطلوب' },
            { status: 400 }
        );
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json(
            { success: false, message: 'معرف الطالب غير صحيح' },
            { status: 400 }
        );
    }

    const isReset = operationType === 'reset';

    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason || trimmedReason.length < 3) {
        return NextResponse.json(
            { success: false, message: 'يجب كتابة سبب العملية (3 أحرف على الأقل)' },
            { status: 400 }
        );
    }

    // --- Idempotency Check ---
    if (requestId) {
        const exists = await PointTransaction.findOne({
            referenceType: `points_op:${requestId}`,
            student: studentId,
        }).lean();
        if (exists) {
            return NextResponse.json({
                success: true,
                message: 'تم تنفيذ العملية مسبقاً',
                data: { alreadyProcessed: true, balanceAfter: (exists as any).balanceAfter },
            });
        }
    }

    // --- Fetch Student ---
    const student = await User.findOne({
        _id: studentId,
        role: 'student',
        status: 'approved',
    }).select('name points');

    if (!student) {
        return NextResponse.json(
            { success: false, message: 'الطالب غير موجود أو غير مفعّل' },
            { status: 404 }
        );
    }

    const currentPoints = student.points || 0;
    const balanceBefore = currentPoints;

    let deductAmount: number;

    if (isReset) {
        if (currentPoints <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'رصيد الطالب صفر بالفعل ولا توجد نقاط لتصفيرها',
                    data: { currentBalance: 0 },
                },
                { status: 400 }
            );
        }
        deductAmount = currentPoints;
    } else {
        deductAmount = Number(amount);
        if (isNaN(deductAmount) || deductAmount <= 0) {
            return NextResponse.json(
                { success: false, message: 'يجب أن تكون قيمة الخصم عدداً موجباً أكبر من صفر' },
                { status: 400 }
            );
        }

        // Prevent going below zero / exceeding balance
        if (deductAmount > currentPoints) {
            return NextResponse.json(
                {
                    success: false,
                    message: `لا يمكن خصم ${deductAmount} نقطة لأن رصيد الطالب ${currentPoints} نقطة فقط`,
                    data: { currentBalance: currentPoints },
                },
                { status: 422 }
            );
        }
    }

    const balanceAfter = currentPoints - deductAmount;

    // --- Atomic update: only deduct if points haven't changed below deductAmount ---
    const updated = await User.findOneAndUpdate(
        { _id: studentId, role: 'student', points: { $gte: deductAmount } },
        { $inc: { points: -deductAmount } },
        { new: true }
    );

    if (!updated) {
        return NextResponse.json(
            { success: false, message: 'فشلت العملية — قد يكون الرصيد قد تغيّر بالتزامن، يرجى إعادة المحاولة' },
            { status: 409 }
        );
    }

    const transactionReason = isReset
        ? `[تصفير النقاط] ${trimmedReason}`
        : `[خصم إداري] ${trimmedReason}`;

    // --- Record Ledger Transaction (negative amount = deduction) ---
    await PointTransaction.create({
        student: studentId,
        amount: -deductAmount,
        type: 'admin_adjustment',
        reason: transactionReason,
        balanceAfter: updated.points,
        createdBy: admin.userId,
        ...(requestId ? { referenceType: `points_op:${requestId}` } : {}),
    });

    // --- Audit Log ---
    const auditAction = isReset ? AUDIT_ACTIONS.POINTS_RESET : AUDIT_ACTIONS.POINTS_DEDUCTED;
    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: auditAction,
        target: studentId,
        targetModel: 'User',
        metadata: {
            operationType: isReset ? 'reset' : 'deduction',
            studentName: student.name,
            balanceBefore,
            balanceAfter: updated.points,
            deductedAmount: deductAmount,
            reason: trimmedReason,
            requestId: requestId ?? null,
        },
    });

    const successMessage = isReset
        ? `تم تصفير نقاط الطالب ${student.name} بنجاح (تم خصم ${deductAmount} نقطة)`
        : `تم خصم ${deductAmount} نقطة من رصيد الطالب ${student.name} بنجاح`;

    return NextResponse.json({
        success: true,
        message: successMessage,
        data: {
            operationType: isReset ? 'reset' : 'deduction',
            studentName: student.name,
            balanceBefore,
            balanceAfter: updated.points,
            deductedAmount: deductAmount,
        },
    });
}

export const POST = withAdmin(postHandler);
