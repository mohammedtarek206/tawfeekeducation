import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction from '@/lib/db/models/PointTransaction';
import { withAdmin } from '@/lib/auth/middleware';
import { awardPoints } from '@/lib/gamification/engine';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

// POST /api/admin/points - manual point adjustment
async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const { studentId, amount, reason } = body;

    if (!studentId || !amount || !reason) {
        return NextResponse.json(
            { success: false, message: 'بيانات ناقصة: studentId, amount, reason مطلوبة' },
            { status: 400 }
        );
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    const result = await awardPoints({
        studentId,
        amount: parseInt(amount),
        type: 'admin_adjustment',
        reason,
        awardedBy: admin.userId,
    });

    if (!result.success) {
        return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.POINTS_ADJUSTED,
        target: studentId,
        targetModel: 'User',
        metadata: { amount, reason, newBalance: result.newBalance },
    });

    return NextResponse.json({
        success: true,
        message: 'تم تعديل النقاط بنجاح',
        data: { newBalance: result.newBalance },
    });
}

// GET /api/admin/points - point transactions
async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filter: Record<string, unknown> = {};
    if (studentId) filter.student = studentId;

    const total = await PointTransaction.countDocuments(filter);
    const transactions = await PointTransaction.find(filter)
        .populate('student', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    // Top students by points
    const topStudents = await User.find({ role: 'student' })
        .select('name phone points grade')
        .sort({ points: -1 })
        .limit(10)
        .lean();

    // Calculate total points awarded
    const [txAgg, userAgg] = await Promise.all([
        PointTransaction.aggregate([{ $match: { amount: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        User.aggregate([{ $match: { role: 'student' } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
    ]);

    const txPoints = txAgg[0]?.total || 0;
    const userPoints = userAgg[0]?.total || 0;
    const totalPointsAwarded = Math.max(txPoints, userPoints);

    return NextResponse.json({
        success: true,
        data: {
            transactions,
            total,
            totalTransactions: total,
            topStudents,
            totalPointsAwarded,
            page,
            pages: Math.ceil(total / limit),
        },
    });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
