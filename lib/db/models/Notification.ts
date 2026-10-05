import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
    | 'account_approved'
    | 'account_rejected'
    | 'new_lesson'
    | 'new_quiz'
    | 'new_exam'
    | 'exam_result'
    | 'points_earned'
    | 'reward_available'
    | 'reward_redeemed'
    | 'booking_confirmed'
    | 'homework'
    | 'announcement'
    | 'task'
    | 'achievement'
    | 'general';

export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    referenceId?: mongoose.Types.ObjectId;
    referenceType?: string;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: {
            type: String,
            enum: [
                'account_approved',
                'account_rejected',
                'new_lesson',
                'new_quiz',
                'new_exam',
                'exam_result',
                'points_earned',
                'reward_available',
                'reward_redeemed',
                'booking_confirmed',
                'homework',
                'announcement',
                'task',
                'achievement',
                'general',
            ],
            required: true,
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        isRead: { type: Boolean, default: false, index: true },
        referenceId: { type: Schema.Types.ObjectId },
        referenceType: { type: String },
    },
    { timestamps: true }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification =
    mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
