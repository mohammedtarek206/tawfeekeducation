import { NextRequest, NextResponse } from 'next/server';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import { lessonApiRateLimit } from '@/lib/security/rateLimit';

/**
 * POST /api/student/security-event
 * Records client-side security events (screen capture detection, PiP, etc.)
 * Only logs events from authenticated students; does NOT expose details back to client.
 * Rate-limited to prevent log flooding.
 */
async function postHandler(
    req: NextRequest,
    _ctx: unknown,
    student: JWTPayload
): Promise<NextResponse> {
    // Reuse lesson rate limiter to prevent log flooding
    const rateLimitResponse = lessonApiRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    let body: { eventType?: string; lessonId?: string; context?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false }, { status: 400 });
    }

    const { eventType, lessonId, context } = body;

    // Validate event type — only accept known security events
    const ALLOWED_EVENTS = ['screen_capture_detected', 'pip_detected'] as const;
    type AllowedEvent = typeof ALLOWED_EVENTS[number];

    if (!eventType || !ALLOWED_EVENTS.includes(eventType as AllowedEvent)) {
        return NextResponse.json({ success: false, message: 'نوع الحدث غير مدعوم' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';

    // Log the security event (non-blocking — never break the main flow)
    const action =
        eventType === 'pip_detected'
            ? AUDIT_ACTIONS.PIP_DETECTED
            : AUDIT_ACTIONS.SCREEN_CAPTURE_DETECTED;

    createAuditLog({
        actor: student.userId,
        actorRole: 'student',
        action,
        target: lessonId || undefined,
        targetModel: lessonId ? 'Lesson' : undefined,
        metadata: {
            // Store only safe, non-sensitive context info
            context: typeof context === 'string' ? context.slice(0, 64) : undefined,
            eventType,
        },
        ipAddress: ip,
        userAgent: ua,
    }).catch(() => { });

    // Return a neutral response — don't reveal what was logged
    return NextResponse.json({ success: true });
}

export const POST = withStudent(postHandler);
