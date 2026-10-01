import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    address: string;
    description?: string;
    image?: string;
    phone?: string;
    googleMapsUrl?: string;
    workingHours?: string;
    isActive: boolean;
    createdAt: Date;
}

const BranchSchema = new Schema<IBranch>(
    {
        name: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        image: { type: String },
        phone: { type: String, trim: true },
        googleMapsUrl: { type: String, trim: true },
        workingHours: { type: String, trim: true },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const Branch = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
export default Branch;
