import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType =
    | 'lesson_completed'
    | 'quiz_completed'
    | 'exam_completed'
    | 'referral'
    | 'reward_redeemed'
    | 'admin_adjustment'
    | 'streak_bonus'
    | 'lesson_watch'
    | 'bonus'
    | 'task_completion'
    | 'achievement';

export interface IPointTransaction extends Document {
    student: mongoose.Types.ObjectId;
    amount: number;
    type: TransactionType;
    reason: string;
    referenceId?: mongoose.Types.ObjectId;
    referenceType?: string;
    balanceAfter: number;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const PointTransactionSchema = new Schema<IPointTransaction>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        amount: { type: Number, required: true },
        type: {
            type: String,
            enum: [
                'lesson_completed',
                'quiz_completed',
                'exam_completed',
                'referral',
                'reward_redeemed',
                'admin_adjustment',
                'streak_bonus',
                'lesson_watch',
                'bonus',
                'task_completion',
                'achievement',
            ],
            required: true,
            index: true,
        },
        reason: { type: String, required: true },
        referenceId: { type: Schema.Types.ObjectId },
        referenceType: { type: String },
        balanceAfter: { type: Number, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

PointTransactionSchema.index({ student: 1, createdAt: -1 });

const PointTransaction =
    mongoose.models.PointTransaction ||
    mongoose.model<IPointTransaction>('PointTransaction', PointTransactionSchema);
export default PointTransaction;
