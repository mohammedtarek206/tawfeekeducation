import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';

export interface HonorBoardSettings {
    enabled: boolean;
    limit: number;
    viewMode: 'all' | 'by_grade';
    showZeroPoints: boolean;
}

export const DEFAULT_HONOR_BOARD_SETTINGS: HonorBoardSettings = {
    enabled: true,
    limit: 20,
    viewMode: 'all',
    showZeroPoints: false,
};

export const HONOR_BOARD_SETTING_KEYS = [
    'honor_board_enabled',
    'honor_board_limit',
    'honor_board_view_mode',
    'honor_board_show_zero_points',
] as const;

/**
 * جلب إعدادات لوحة الشرف المعتمدة من قاعدة البيانات
 */
export async function getHonorBoardSettings(): Promise<HonorBoardSettings> {
    try {
        await connectDB();
        const docs = await Settings.find({ key: { $in: HONOR_BOARD_SETTING_KEYS } }).lean();

        const map: Record<string, any> = {};
        docs.forEach((doc: any) => {
            map[doc.key] = doc.value;
        });

        const enabled =
            map['honor_board_enabled'] !== undefined
                ? Boolean(map['honor_board_enabled'])
                : DEFAULT_HONOR_BOARD_SETTINGS.enabled;

        const rawLimit = Number(map['honor_board_limit']);
        const limit =
            !isNaN(rawLimit) && rawLimit >= 5 && rawLimit <= 100
                ? rawLimit
                : DEFAULT_HONOR_BOARD_SETTINGS.limit;

        const rawViewMode = String(map['honor_board_view_mode'] || '').trim();
        const viewMode: 'all' | 'by_grade' =
            rawViewMode === 'by_grade' ? 'by_grade' : 'all';

        const showZeroPoints =
            map['honor_board_show_zero_points'] !== undefined
                ? Boolean(map['honor_board_show_zero_points'])
                : DEFAULT_HONOR_BOARD_SETTINGS.showZeroPoints;

        return {
            enabled,
            limit,
            viewMode,
            showZeroPoints,
        };
    } catch (error) {
        console.error('Error fetching honor board settings:', error);
        return { ...DEFAULT_HONOR_BOARD_SETTINGS };
    }
}

/**
 * تحديث إعدادات لوحة الشرف في قاعدة البيانات مع تسجيل التدقيق (Audit Log)
 */
export async function updateHonorBoardSettings(
    updates: Partial<HonorBoardSettings>,
    adminUserId?: string
): Promise<HonorBoardSettings> {
    await connectDB();

    const ops: any[] = [];

    if (updates.enabled !== undefined) {
        ops.push({
            updateOne: {
                filter: { key: 'honor_board_enabled' },
                update: {
                    $set: {
                        value: Boolean(updates.enabled),
                        category: 'honor_board',
                        type: 'boolean',
                        description: 'تفعيل أو إيقاف عرض لوحة الشرف للطلاب',
                        updatedBy: adminUserId,
                    },
                },
                upsert: true,
            },
        });
    }

    if (updates.limit !== undefined) {
        const parsedLimit = Math.min(100, Math.max(5, Number(updates.limit) || 20));
        ops.push({
            updateOne: {
                filter: { key: 'honor_board_limit' },
                update: {
                    $set: {
                        value: parsedLimit,
                        category: 'honor_board',
                        type: 'number',
                        description: 'الحد الأقصى لعدد الطلاب المعروضين في لوحة الشرف',
                        updatedBy: adminUserId,
                    },
                },
                upsert: true,
            },
        });
    }

    if (updates.viewMode !== undefined) {
        const mode: 'all' | 'by_grade' = updates.viewMode === 'by_grade' ? 'by_grade' : 'all';
        ops.push({
            updateOne: {
                filter: { key: 'honor_board_view_mode' },
                update: {
                    $set: {
                        value: mode,
                        category: 'honor_board',
                        type: 'string',
                        description: 'نمط عرض لوحة الشرف: عامة لجميع الصفوف أو حسب الصف الدراسي',
                        updatedBy: adminUserId,
                    },
                },
                upsert: true,
            },
        });
    }

    if (updates.showZeroPoints !== undefined) {
        ops.push({
            updateOne: {
                filter: { key: 'honor_board_show_zero_points' },
                update: {
                    $set: {
                        value: Boolean(updates.showZeroPoints),
                        category: 'honor_board',
                        type: 'boolean',
                        description: 'إظهار الطلاب الذين يملكون صفر نقطة في لوحة الشرف',
                        updatedBy: adminUserId,
                    },
                },
                upsert: true,
            },
        });
    }

    if (ops.length > 0) {
        await Settings.bulkWrite(ops);

        if (adminUserId) {
            await createAuditLog({
                actor: adminUserId,
                actorRole: 'admin',
                action: AUDIT_ACTIONS.SETTINGS_CHANGED,
                metadata: {
                    section: 'honor_board',
                    updates,
                },
            });
        }
    }

    return getHonorBoardSettings();
}
