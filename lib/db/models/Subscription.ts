import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'rejected' | 'cancelled';
export type SubscriptionSource = 'free_offer' | 'payment' | 'admin_manual';

export interface ISubscription extends Document {
    _id: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    planId?: mongoose.Types.ObjectId;
    gradeId: string;
    status: SubscriptionStatus;
    source: SubscriptionSource;
    startDate: Date;
    endDate: Date;
    paymentRequestId?: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: false, index: true },
        gradeId: { type: String, required: true, index: true },
        status: {
            type: String,
            enum: ['pending', 'active', 'expired', 'rejected', 'cancelled'],
            default: 'active',
            index: true,
        },
        source: {
            type: String,
            enum: ['free_offer', 'payment', 'admin_manual'],
            required: true,
            index: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        paymentRequestId: { type: Schema.Types.ObjectId, ref: 'PaymentRequest', required: false },
        notes: { type: String, trim: true },
    },
    { timestamps: true }
);

SubscriptionSchema.index({ studentId: 1, status: 1 });
SubscriptionSchema.index({ studentId: 1, gradeId: 1, status: 1 });

if (mongoose.models.Subscription) {
    delete mongoose.models.Subscription;
}
const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
