import mongoose, { Document, Schema } from 'mongoose';

export type AdminAlertCategory = 'inactivity' | 'subscription' | 'achievement' | 'payment';
export type AdminAlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface IAdminAlert extends Document {
    _id: mongoose.Types.ObjectId;
    category: AdminAlertCategory;
    type: string;
    title: string;
    message: string;
    severity: AdminAlertSeverity;
    studentId?: mongoose.Types.ObjectId;
    studentName?: string;
    actionUrl: string;
    dedupKey: string;
    isRead: boolean;
    isResolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const AdminAlertSchema = new Schema<IAdminAlert>(
    {
        category: {
            type: String,
            enum: ['inactivity', 'subscription', 'achievement', 'payment'],
            required: true,
            index: true,
        },
        type: { type: String, required: true, index: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        severity: {
            type: String,
            enum: ['critical', 'warning', 'info', 'success'],
            default: 'info',
            index: true,
        },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        studentName: { type: String },
        actionUrl: { type: String, default: '/admin/dashboard' },
        dedupKey: { type: String, required: true, unique: true, index: true },
        isRead: { type: Boolean, default: false, index: true },
        isResolved: { type: Boolean, default: false, index: true },
        resolvedAt: { type: Date },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

AdminAlertSchema.index({ isResolved: 1, createdAt: -1 });
AdminAlertSchema.index({ category: 1, isResolved: 1 });

if (mongoose.models.AdminAlert) {
    delete mongoose.models.AdminAlert;
}

const AdminAlert = mongoose.model<IAdminAlert>('AdminAlert', AdminAlertSchema);
export default AdminAlert;
