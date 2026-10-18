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

    const { studentId, amount, reason, requestId } = body as {
        studentId?: string;
        amount?: unknown;
        reason?: string;
        requestId?: string;
    };

    // --- Basic Validation ---
    if (!studentId || !amount || !reason) {
        return NextResponse.json(
            { success: false, message: 'بيانات ناقصة: studentId و amount و reason مطلوبة' },
            { status: 400 }
        );
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    const deductAmount = Number(amount);
    if (isNaN(deductAmount) || deductAmount <= 0) {
        return NextResponse.json(
            { success: false, message: 'يجب أن تكون قيمة الخصم عدداً موجباً' },
            { status: 400 }
        );
    }

    const trimmedReason = String(reason).trim();
    if (!trimmedReason || trimmedReason.length < 3) {
        return NextResponse.json(
            { success: false, message: 'يجب كتابة سبب الخصم (3 أحرف على الأقل)' },
            { status: 400 }
        );
    }

    // --- Idempotency Check ---
    if (requestId) {
        const exists = await PointTransaction.findOne({
            referenceType: `deduct_req:${requestId}`,
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

    // --- Fetch Student with atomic lock ---
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

    // --- Prevent going below zero ---
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

    const balanceAfter = currentPoints - deductAmount;

    // --- Atomic update: only deduct if points haven't changed mid-request ---
    const updated = await User.findOneAndUpdate(
        { _id: studentId, role: 'student', points: { $gte: deductAmount } },
        { $inc: { points: -deductAmount } },
        { new: true }
    );

    if (!updated) {
        return NextResponse.json(
            { success: false, message: 'فشلت العملية — قد يكون الرصيد قد تغيّر، أعد المحاولة' },
            { status: 409 }
        );
    }

    // --- Record Ledger Transaction (negative amount = deduction) ---
    await PointTransaction.create({
        student: studentId,
        amount: -deductAmount,
        type: 'admin_adjustment',
        reason: `[خصم إداري] ${trimmedReason}`,
        balanceAfter,
        createdBy: admin.userId,
        ...(requestId ? { referenceType: `deduct_req:${requestId}` } : {}),
    });

    // --- Audit Log ---
    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.POINTS_DEDUCTED,
        target: studentId,
        targetModel: 'User',
        metadata: {
            studentName: student.name,
            balanceBefore,
            balanceAfter,
            deductedAmount: deductAmount,
            reason: trimmedReason,
            requestId: requestId ?? null,
        },
    });

    return NextResponse.json({
        success: true,
        message: `تم خصم ${deductAmount} نقطة من رصيد الطالب بنجاح`,
        data: {
            studentName: student.name,
            balanceBefore,
            balanceAfter: updated.points,
            deductedAmount: deductAmount,
        },
    });
}

export const POST = withAdmin(postHandler);
