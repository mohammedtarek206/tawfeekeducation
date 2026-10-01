import connectDB from '@/lib/db/connect';
import AuditLog from '@/lib/db/models/AuditLog';
import mongoose from 'mongoose';

export interface AuditLogOptions {
    actor: string | mongoose.Types.ObjectId;
    actorRole: string;
    action: string;
    target?: string | mongoose.Types.ObjectId;
    targetModel?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export async function createAuditLog(options: AuditLogOptions): Promise<void> {
    try {
        await connectDB();
        await AuditLog.create({
            actor: options.actor,
            actorRole: options.actorRole,
            action: options.action,
            target: options.target,
            targetModel: options.targetModel,
            metadata: options.metadata,
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
        });
    } catch (error) {
        // Never let audit logging break the main operation
        console.error('Audit log error:', error);
    }
}

export const AUDIT_ACTIONS = {
    ADMIN_LOGIN: 'admin.login',
    STUDENT_APPROVED: 'student.approved',
    STUDENT_REJECTED: 'student.rejected',
    STUDENT_SUSPENDED: 'student.suspended',
    STUDENT_ACTIVATED: 'student.activated',
    POINTS_ADJUSTED: 'points.adjusted',
    LESSON_CREATED: 'lesson.created',
    LESSON_UPDATED: 'lesson.updated',
    LESSON_DELETED: 'lesson.deleted',
    EXAM_CREATED: 'exam.created',
    EXAM_DELETED: 'exam.deleted',
    REWARD_CREATED: 'reward.created',
    REDEMPTION_APPROVED: 'redemption.approved',
    BOOKING_CONFIRMED: 'booking.confirmed',
    SETTINGS_CHANGED: 'settings.changed',
    FREE_SLOT_ASSIGNED: 'free_slot.assigned',
    REFERRAL_REWARDED: 'referral.rewarded',
};
