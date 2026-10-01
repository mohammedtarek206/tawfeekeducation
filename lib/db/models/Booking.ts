import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface IBooking extends Document {
    student: mongoose.Types.ObjectId;
    branch: mongoose.Types.ObjectId;
    classGroup: mongoose.Types.ObjectId;
    status: BookingStatus;
    adminNotes?: string;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
    createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
        classGroup: { type: Schema.Types.ObjectId, ref: 'ClassGroup', required: true },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            default: 'pending',
            index: true,
        },
        adminNotes: { type: String },
        processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        processedAt: { type: Date },
    },
    { timestamps: true }
);

BookingSchema.index({ student: 1, classGroup: 1 }, { unique: true });

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
export default Booking;
