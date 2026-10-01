import mongoose, { Document, Schema } from 'mongoose';

export type ReferralStatus = 'pending' | 'verified' | 'approved' | 'rewarded' | 'rejected';

export interface IReferral extends Document {
    referrer: mongoose.Types.ObjectId;
    referred: mongoose.Types.ObjectId;
    code: string;
    status: ReferralStatus;
    pointsAwarded: boolean;
    pointsAmount: number;
    rejectionReason?: string;
    approvedAt?: Date;
    rewardedAt?: Date;
    createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
    {
        referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        referred: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        code: { type: String, required: true, index: true },
        status: {
            type: String,
            enum: ['pending', 'verified', 'approved', 'rewarded', 'rejected'],
            default: 'pending',
            index: true,
        },
        pointsAwarded: { type: Boolean, default: false },
        pointsAmount: { type: Number, default: 0 },
        rejectionReason: { type: String },
        approvedAt: { type: Date },
        rewardedAt: { type: Date },
    },
    { timestamps: true }
);

ReferralSchema.index({ referrer: 1, status: 1 });

const Referral =
    mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);
export default Referral;
