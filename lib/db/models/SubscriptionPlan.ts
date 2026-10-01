import mongoose, { Document, Schema } from 'mongoose';

export type PlanType = 'monthly' | 'term' | 'yearly';
export type OfferType = 'FREE_FIRST_N' | 'DISCOUNT_FIRST_N' | 'NONE';

export interface ISubscriptionPlan extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    grade: string;
    description?: string;
    type: PlanType;
    durationInDays: number;
    price: number;
    originalPrice?: number;
    discountPercentage?: number;
    offerEnabled: boolean;
    offerType: OfferType;
    offerLimit: number;
    offerUsed: number;
    features: string[];
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
    {
        name: { type: String, required: true, trim: true },
        grade: { type: String, required: true, index: true },
        description: { type: String, trim: true },
        type: { type: String, enum: ['monthly', 'term', 'yearly'], required: true },
        durationInDays: { type: Number, required: true },
        price: { type: Number, required: true, min: 0 },
        originalPrice: { type: Number, min: 0 },
        discountPercentage: { type: Number, min: 0, max: 100 },
        offerEnabled: { type: Boolean, default: false },
        offerType: { type: String, enum: ['FREE_FIRST_N', 'DISCOUNT_FIRST_N', 'NONE'], default: 'NONE' },
        offerLimit: { type: Number, default: 0 },
        offerUsed: { type: Number, default: 0 },
        features: [{ type: String }],
        active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

SubscriptionPlanSchema.index({ grade: 1, active: 1 });

if (mongoose.models.SubscriptionPlan) {
    delete mongoose.models.SubscriptionPlan;
}
const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
export default SubscriptionPlan;
