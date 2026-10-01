import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    actor: mongoose.Types.ObjectId;
    actorRole: string;
    action: string;
    target?: mongoose.Types.ObjectId;
    targetModel?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        actorRole: { type: String, required: true },
        action: { type: String, required: true, index: true },
        target: { type: Schema.Types.ObjectId },
        targetModel: { type: String },
        metadata: { type: Schema.Types.Mixed },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog =
    mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
