import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getFreeOfferSettings } from '@/lib/settings/freeOffer';
import { createAuditLog } from '@/lib/security/auditLog';

export const revalidate = 0;

// GET /api/admin/free-students/settings
async function getHandler(_req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const settings = await getFreeOfferSettings();
    return NextResponse.json({ success: true, data: { settings } });
}

// POST /api/admin/free-students/settings
async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const {
        freeOfferEnabled,
        freeStudentsLimit,
        freeOfferDuration,
        freeOfferDurationUnit,
        freeOfferEligibleGrades,
        freeOfferGrantMode,
        freeOfferAudience,
        freeOfferTitle,
        freeOfferDescription,
        freeOfferStartDate,
        freeOfferEndDate,
    } = body;

    const updates: Array<{ key: string; value: any; description: string }> = [
        {
            key: 'free_offer_enabled',
            value: Boolean(freeOfferEnabled),
            description: 'تفعيل أو إيقاف العرض المجاني',
        },
        {
            key: 'free_student_limit',
            value: Math.max(1, parseInt(String(freeStudentsLimit || '100'), 10)),
            description: 'الحد الأقصى لعدد الطلاب المجانيين',
        },
        {
            key: 'free_offer_duration',
            value: Math.max(1, parseInt(String(freeOfferDuration || '30'), 10)),
            description: 'مدة الاشتراك المجاني',
        },
        {
            key: 'free_offer_duration_unit',
            value: freeOfferDurationUnit === 'hours' ? 'hours' : 'days',
            description: 'وحدة مدة الاشتراك المجاني (days أو hours)',
        },
        {
            key: 'free_offer_eligible_grades',
            value: Array.isArray(freeOfferEligibleGrades) ? freeOfferEligibleGrades : [],
            description: 'الصفوف الدراسية المؤهلة للاشتراك المجاني',
        },
        {
            key: 'free_offer_grant_mode',
            value: freeOfferGrantMode === 'auto_register' ? 'auto_register' : 'admin_approval',
            description: 'طريقة منح الاشتراك المجاني (تلقائياً عند التسجيل أو بعد موافقة الأدمن)',
        },
        {
            key: 'free_offer_audience',
            value: freeOfferAudience === 'specific_grades' || freeOfferAudience === 'new_registered' ? freeOfferAudience : 'all',
            description: 'الفئة المستهدفة من الاشتراك المجاني',
        },
    ];

    if (freeOfferTitle !== undefined) {
        updates.push({
            key: 'free_offer_title',
            value: String(freeOfferTitle).trim(),
            description: 'عنوان العرض المجاني',
        });
    }

    if (freeOfferDescription !== undefined) {
        updates.push({
            key: 'free_offer_description',
            value: String(freeOfferDescription).trim(),
            description: 'وصف العرض المجاني',
        });
    }

    if (freeOfferStartDate !== undefined) {
        updates.push({
            key: 'free_offer_start_date',
            value: freeOfferStartDate ? new Date(freeOfferStartDate) : null,
            description: 'تاريخ بدء سريان العرض المجاني',
        });
    }

    if (freeOfferEndDate !== undefined) {
        updates.push({
            key: 'free_offer_end_date',
            value: freeOfferEndDate ? new Date(freeOfferEndDate) : null,
            description: 'تاريخ انتهاء سريان العرض المجاني',
        });
    }

    // Save each setting atomically
    for (const item of updates) {
        await Settings.findOneAndUpdate(
            { key: item.key },
            { $set: { value: item.value, description: item.description } },
            { upsert: true, new: true }
        );
    }

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: 'FREE_OFFER_SETTINGS_UPDATED',
        target: 'Settings',
        targetModel: 'Settings',
        metadata: { updates: updates.map((u) => ({ key: u.key, value: u.value })) },
    });

    const updatedSettings = await getFreeOfferSettings();

    return NextResponse.json({
        success: true,
        message: 'تم حفظ إعدادات الاشتراك المجاني بنجاح',
        data: { settings: updatedSettings },
    });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
export const PUT = withAdmin(postHandler);
