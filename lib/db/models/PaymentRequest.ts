import mongoose, { Document, Schema } from 'mongoose';

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IPaymentRequest extends Document {
    _id: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    paymentProof: string;
    status: PaymentRequestStatus;
    adminNote?: string;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentRequestSchema = new Schema<IPaymentRequest>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
        amount: { type: Number, required: true },
        paymentMethod: { type: String, required: true },
        transactionRef: { type: String, trim: true },
        paymentProof: { type: String, required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
        adminNote: { type: String },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
);

if (mongoose.models.PaymentRequest) {
    delete mongoose.models.PaymentRequest;
}
const PaymentRequest = mongoose.model<IPaymentRequest>('PaymentRequest', PaymentRequestSchema);
export default PaymentRequest;
