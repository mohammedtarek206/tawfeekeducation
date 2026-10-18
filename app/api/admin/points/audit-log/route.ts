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
        action: AUDIT_ACTIONS.POINTS_DEDUCTED,
    };
    if (studentId) filter.target = studentId;

    const [total, logs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(filter)
            .populate('actor', 'name')
            .populate('target', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);

    const formatted = logs.map((log: any) => ({
        id: log._id,
        actor: log.actor?.name ?? log.actor ?? '—',
        studentName: log.metadata?.studentName ?? (log.target as any)?.name ?? '—',
        studentId: log.target?.toString() ?? '—',
        balanceBefore: log.metadata?.balanceBefore ?? 0,
        balanceAfter: log.metadata?.balanceAfter ?? 0,
        deductedAmount: log.metadata?.deductedAmount ?? 0,
        reason: log.metadata?.reason ?? '—',
        createdAt: log.createdAt,
    }));

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
