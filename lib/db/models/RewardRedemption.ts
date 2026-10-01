import mongoose, { Document, Schema } from 'mongoose';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface IRewardRedemption extends Document {
    student: mongoose.Types.ObjectId;
    reward: mongoose.Types.ObjectId;
    pointsSpent: number;
    status: RedemptionStatus;
    adminNotes?: string;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
    createdAt: Date;
}

const RewardRedemptionSchema = new Schema<IRewardRedemption>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        reward: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
        pointsSpent: { type: Number, required: true },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
            index: true,
        },
        adminNotes: { type: String },
        processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        processedAt: { type: Date },
    },
    { timestamps: true }
);

const RewardRedemption =
    mongoose.models.RewardRedemption ||
    mongoose.model<IRewardRedemption>('RewardRedemption', RewardRedemptionSchema);
export default RewardRedemption;
