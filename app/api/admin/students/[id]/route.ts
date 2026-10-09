import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Referral from '@/lib/db/models/Referral';
import Notification from '@/lib/db/models/Notification';
import { withAdmin } from '@/lib/auth/middleware';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import { awardPoints } from '@/lib/gamification/engine';
import { JWTPayload } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

type ActionType = 'approve' | 'reject' | 'suspend' | 'activate';

async function handler(
    req: NextRequest,
    context: { params?: Record<string, string> },
    adminUser: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const studentId = context.params?.id;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    if (req.method === 'GET') {
        const student = await User.findOne({ _id: studentId, role: 'student' })
            .select('-password')
            .lean();
        if (!student) {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: { student } });
    }

    if (req.method === 'PATCH') {
        const body = await req.json();
        const action: ActionType = body.action;

        const student = await User.findOne({ _id: studentId, role: 'student' });
        if (!student) {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
        }

        let newStatus = student.status;
        let notificationTitle = '';
        let notificationMessage = '';
        let auditAction = '';

        switch (action) {
            case 'approve': {
                const { getFreeOfferStats, assignFreeSlotAtomically } = await import('@/lib/settings/freeOffer');
                const stats = await getFreeOfferStats();

                let isFreeStudent = false;
                let freeSlotNumber: number | undefined;

                if (stats.isOfferActive) {
                    const res = await assignFreeSlotAtomically(studentId, student.grade);
                    if (res.assigned) {
                        isFreeStudent = true;
                        freeSlotNumber = res.slotNumber;
                        await createAuditLog({
                            actor: adminUser.userId,
                            actorRole: 'admin',
                            action: AUDIT_ACTIONS.FREE_SLOT_ASSIGNED,
                            target: studentId,
                            targetModel: 'User',
                            metadata: { slotNumber: freeSlotNumber, totalFree: freeSlotNumber },
                        });
                    }
                }

                if (!isFreeStudent) {
                    await User.findByIdAndUpdate(studentId, {
                        status: 'approved',
                        isFreeStudent: false,
                        subscriptionStatus: 'none',
                        rejectionReason: null
                    });
                } else {
                    await User.findByIdAndUpdate(studentId, {
                        status: 'approved',
                        rejectionReason: null
                    });
                }

                newStatus = 'approved';
                notificationTitle = isFreeStudent ? '🎉 تم قبولك في العرض المجاني!' : 'تم قبول طلبك!';
                notificationMessage = isFreeStudent
                    ? `تهانينا! تم قبول حسابك وتفعيل العرض المجاني (المقعد رقم #${freeSlotNumber}). يمكنك الآن الوصول لجميع الدروس والامتحانات مجاناً.`
                    : 'تهانينا! تم الموافقة على حسابك في منصة التوفيق. يمكنك الآن الدخول والبدء في التعلم.';
                auditAction = AUDIT_ACTIONS.STUDENT_APPROVED;

                // Handle referral rewards
                await processReferralReward(studentId, adminUser.userId);
                break;
            }
            case 'reject':
                const rejectionReason = body.rejectionReason || '';
                await User.findByIdAndUpdate(studentId, { status: 'rejected', rejectionReason });
                newStatus = 'rejected';
                notificationTitle = 'نتيجة طلب التسجيل';
                notificationMessage = `نأسف، لم يتم قبول طلب تسجيلك. ${rejectionReason ? `السبب: ${rejectionReason}` : 'تواصل مع الإدارة لمزيد من المعلومات.'}`;
                auditAction = AUDIT_ACTIONS.STUDENT_REJECTED;
                break;
            case 'suspend':
                await User.findByIdAndUpdate(studentId, { status: 'suspended' });
                newStatus = 'suspended';
                notificationTitle = 'إيقاف الحساب';
                notificationMessage = 'تم إيقاف حسابك مؤقتاً. تواصل مع الإدارة.';
                auditAction = AUDIT_ACTIONS.STUDENT_SUSPENDED;
                break;
            case 'activate':
                await User.findByIdAndUpdate(studentId, { status: 'approved' });
                newStatus = 'approved';
                notificationTitle = 'تم تفعيل حسابك';
                notificationMessage = 'تم إعادة تفعيل حسابك. مرحباً بك مجدداً!';
                auditAction = AUDIT_ACTIONS.STUDENT_ACTIVATED;
                break;
            default:
                return NextResponse.json({ success: false, message: 'إجراء غير صحيح' }, { status: 400 });
        }

        // Send notification
        await Notification.create({
            user: studentId,
            type: action === 'approve' || action === 'activate' ? 'account_approved' : 'account_rejected',
            title: notificationTitle,
            message: notificationMessage,
        });

        await createAuditLog({
            actor: adminUser.userId,
            actorRole: 'admin',
            action: auditAction,
            target: studentId,
            targetModel: 'User',
            metadata: { previousStatus: student.status, newStatus, reason: body.reason },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            message: 'تم تحديث حالة الطالب بنجاح',
            data: { newStatus },
        });
    }

    if (req.method === 'DELETE') {
        const student = await User.findOne({ _id: studentId, role: 'student' });
        if (!student) {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
        }

        await User.findByIdAndDelete(studentId);

        // Cleanup associated records
        await Promise.allSettled([
            Referral.deleteMany({ $or: [{ referrer: studentId }, { referred: studentId }] }),
            Notification.deleteMany({ user: studentId }),
            import('@/lib/db/models/StudentTask').then(({ default: StudentTask }) => StudentTask.deleteMany({ student: studentId })),
            import('@/lib/db/models/StudentAchievement').then(({ default: StudentAchievement }) => StudentAchievement.deleteMany({ student: studentId })),
            import('@/lib/db/models/PointTransaction').then(({ default: PointTransaction }) => PointTransaction.deleteMany({ student: studentId })),
            import('@/lib/db/models/PaymentRequest').then(({ default: PaymentRequest }) => PaymentRequest.deleteMany({ student: studentId })),
        ]);

        await createAuditLog({
            actor: adminUser.userId,
            actorRole: 'admin',
            action: (AUDIT_ACTIONS as any).STUDENT_DELETED || 'STUDENT_DELETED',
            target: studentId,
            targetModel: 'User',
            metadata: { name: student.name, phone: student.phone },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({ success: true, message: 'تم حذف الطالب وجميع بياناته المرتبطة بنجاح' });
    }

    return NextResponse.json({ success: false, message: 'طريقة الطلب غير مدعومة' }, { status: 405 });
}

async function processReferralReward(studentId: string, adminId: string): Promise<void> {
    const { evaluateReferralForStudent } = await import('@/lib/referrals/processor');
    await evaluateReferralForStudent(studentId, 'approval', adminId);
}

export const GET = withAdmin((req, ctx, user) => handler(req, ctx, user));
export const PATCH = withAdmin((req, ctx, user) => handler(req, ctx, user));
export const DELETE = withAdmin((req, ctx, user) => handler(req, ctx, user));
