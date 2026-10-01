import mongoose, { Document, Schema } from 'mongoose';

export interface IReward extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    image?: string;
    requiredPoints: number;
    quantity: number;
    redeemedCount: number;
    isActive: boolean;
    expiresAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        image: { type: String },
        requiredPoints: { type: Number, required: true, min: 1 },
        quantity: { type: Number, required: true, min: 0 },
        redeemedCount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true, index: true },
        expiresAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

const Reward = mongoose.models.Reward || mongoose.model<IReward>('Reward', RewardSchema);
export default Reward;
