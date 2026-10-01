import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

async function getHandler(): Promise<NextResponse> {
    await connectDB();
    const settings = await Settings.find({}).lean();
    const settingsMap: Record<string, unknown> = {};
    settings.forEach((s) => {
        settingsMap[s.key] = s.value;
    });
    return NextResponse.json({ success: true, data: { settings: settingsMap } });
}

async function patchHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const { updates } = body; // Array of { key, value }

    if (!Array.isArray(updates) || updates.length === 0) {
        return NextResponse.json({ success: false, message: 'لا توجد تحديثات' }, { status: 400 });
    }

    const operations = updates.map(({ key, value }: { key: string; value: unknown }) => ({
        updateOne: {
            filter: { key },
            update: { $set: { value, updatedBy: admin.userId } },
            upsert: true,
        },
    }));

    await Settings.bulkWrite(operations);

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.SETTINGS_CHANGED,
        metadata: { updatedKeys: updates.map((u: { key: string }) => u.key) },
    });

    return NextResponse.json({ success: true, message: 'تم حفظ الإعدادات' });
}

export const GET = withAdmin(getHandler);
export const PATCH = withAdmin(patchHandler);
