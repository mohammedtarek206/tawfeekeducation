import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethod extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    number: string;
    instructions?: string;
    accountName?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
    {
        name: { type: String, required: true, trim: true },
        number: { type: String, required: true, trim: true },
        instructions: { type: String, trim: true },
        accountName: { type: String, trim: true },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

if (mongoose.models.PaymentMethod) {
    delete mongoose.models.PaymentMethod;
}
const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
export default PaymentMethod;
