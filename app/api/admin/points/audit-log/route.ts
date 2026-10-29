import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { AUDIT_ACTIONS } from '@/lib/security/auditLog';

async function getHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const studentId = searchParams.get('studentId');

    const filter: Record<string, unknown> = {
        action: { $in: [AUDIT_ACTIONS.POINTS_DEDUCTED, AUDIT_ACTIONS.POINTS_RESET, AUDIT_ACTIONS.POINTS_ADJUSTED] },
    };
    if (studentId) filter.target = studentId;

    const [total, logs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(filter)
            .populate('actor', 'name phone')
            .populate('target', 'name phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);

    const formatted = logs.map((log: any) => {
        const metadata = log.metadata || {};
        let operationType: 'deduction' | 'reset' | 'adjustment' | 'bulk_reset' = 'deduction';
        if (metadata.operationType === 'bulk_reset') {
            operationType = 'bulk_reset';
        } else if (log.action === AUDIT_ACTIONS.POINTS_RESET || metadata.operationType === 'reset') {
            operationType = 'reset';
        } else if (log.action === AUDIT_ACTIONS.POINTS_ADJUSTED) {
            operationType = 'adjustment';
        }

        const isBulk = operationType === 'bulk_reset';

        return {
            id: log._id.toString(),
            actorId: log.actor?._id?.toString() || (typeof log.actor === 'string' ? log.actor : '—'),
            actorName: log.actor?.name || 'الأدمن',
            studentId: isBulk ? 'bulk_all' : (log.target?._id?.toString() || log.target?.toString() || metadata.studentId || '—'),
            studentName: isBulk ? `جميع الطلاب (${metadata.affectedCount ?? 0} طالب)` : (metadata.studentName || log.target?.name || '—'),
            operationType,
            balanceBefore: isBulk ? (metadata.totalPointsRemoved ?? 0) : (metadata.balanceBefore ?? 0),
            deductedAmount: isBulk ? (metadata.totalPointsRemoved ?? 0) : (metadata.deductedAmount ?? metadata.amount ?? 0),
            balanceAfter: metadata.balanceAfter ?? (isBulk ? 0 : (metadata.newBalance ?? 0)),
            reason: metadata.reason || '—',
            createdAt: log.createdAt,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            logs: formatted,
            total,
            page,
            pages: Math.ceil(total / limit),
        },
    });
}

export const GET = withAdmin(getHandler);
