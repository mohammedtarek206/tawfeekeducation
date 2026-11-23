import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import AdminAlert from '@/lib/db/models/AdminAlert';
import { syncAdminAlerts } from '@/lib/alerts/engine';
import { withAdmin } from '@/lib/auth/middleware';

export const revalidate = 0;

// GET /api/admin/alerts - retrieve alerts with filters and real-time sync
async function getHandler(req: NextRequest, user: any): Promise<NextResponse> {
    await connectDB();

    // Auto-sync alerts atomically (dedupKey prevents duplication)
    try {
        await syncAdminAlerts();
    } catch (e) {
        console.error('Error syncing admin alerts:', e);
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active'; // 'active' | 'resolved' | 'all'
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: Record<string, any> = {};

    if (category && category !== 'all') {
        query.category = category;
    }

    if (status === 'active') {
        query.isResolved = false;
    } else if (status === 'resolved') {
        query.isResolved = true;
    }

    if (severity && severity !== 'all') {
        query.severity = severity;
    }

    const [alerts, unreadCount, unresolvedCount, categoryCounts] = await Promise.all([
        AdminAlert.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),
        AdminAlert.countDocuments({ isRead: false }),
        AdminAlert.countDocuments({ isResolved: false }),
        AdminAlert.aggregate([
            { $match: { isResolved: false } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
    ]);

    const countsByCategory: Record<string, number> = {
        inactivity: 0,
        subscription: 0,
        achievement: 0,
        payment: 0,
    };
    categoryCounts.forEach((c: any) => {
        if (c._id && countsByCategory[c._id] !== undefined) {
            countsByCategory[c._id] = c.count;
        }
    });

    return NextResponse.json({
        success: true,
        data: {
            alerts,
            counts: {
                unread: unreadCount,
                unresolved: unresolvedCount,
                byCategory: countsByCategory,
            },
        },
    });
}

// PATCH /api/admin/alerts - mark as read, resolve, reopen
async function patchHandler(req: NextRequest, user: any): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { action, alertId, category } = body;

    if (!action) {
        return NextResponse.json({ success: false, message: 'Action is required' }, { status: 400 });
    }

    const adminId = user?.userId || user?._id;

    if (action === 'mark_read') {
        if (alertId) {
            await AdminAlert.findByIdAndUpdate(alertId, { isRead: true });
        } else {
            const filter: any = { isRead: false };
            if (category) filter.category = category;
            await AdminAlert.updateMany(filter, { isRead: true });
        }
        return NextResponse.json({ success: true, message: 'تم التحديد كمقروء' });
    }

    if (action === 'resolve') {
        if (!alertId) {
            return NextResponse.json({ success: false, message: 'alertId required' }, { status: 400 });
        }
        await AdminAlert.findByIdAndUpdate(alertId, {
            isResolved: true,
            isRead: true,
            resolvedAt: new Date(),
            resolvedBy: adminId,
        });
        return NextResponse.json({ success: true, message: 'تمت معالجة التنبيه بنجاح' });
    }

    if (action === 'resolve_all') {
        const filter: any = { isResolved: false };
        if (category && category !== 'all') filter.category = category;
        await AdminAlert.updateMany(filter, {
            isResolved: true,
            isRead: true,
            resolvedAt: new Date(),
            resolvedBy: adminId,
        });
        return NextResponse.json({ success: true, message: 'تمت معالجة جميع التنبيهات المحددة' });
    }

    if (action === 'reopen') {
        if (!alertId) {
            return NextResponse.json({ success: false, message: 'alertId required' }, { status: 400 });
        }
        await AdminAlert.findByIdAndUpdate(alertId, {
            isResolved: false,
            resolvedAt: null,
            resolvedBy: null,
        });
        return NextResponse.json({ success: true, message: 'تم إعادة فتح التنبيه' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}

export const GET = withAdmin(getHandler);
export const PATCH = withAdmin(patchHandler);
