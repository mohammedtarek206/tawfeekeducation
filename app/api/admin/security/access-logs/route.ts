import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

/**
 * GET /api/admin/security/access-logs
 * Returns recent unauthorized access attempts filtered by action type.
 * Query params: page, limit, action
 */
async function getHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const actionFilter = searchParams.get('action') || '';

    const filter: Record<string, any> = {
        action: actionFilter
            ? actionFilter
            : { $in: ['security.unauthorized_video_access', 'security.unauthorized_lesson_access'] },
    };

    const [logs, total] = await Promise.all([
        AuditLog.find(filter)
            .populate('actor', 'name phone grade')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        AuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
        success: true,
        data: {
            logs,
            total,
            page,
            pages: Math.ceil(total / limit),
        },
    });
}

export const GET = withAdmin(getHandler);
