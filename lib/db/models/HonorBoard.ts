import mongoose, { Document, Schema } from 'mongoose';

export interface IHonorBoardEntry extends Document {
    _id: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    rank: number;
    note?: string;
    addedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const HonorBoardSchema = new Schema<IHonorBoardEntry>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        rank: {
            type: Number,
            required: true,
            min: 1,
            index: true,
        },
        note: {
            type: String,
            trim: true,
            maxlength: 200,
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

HonorBoardSchema.index({ rank: 1, createdAt: 1 });

const HonorBoard =
    mongoose.models.HonorBoard ||
    mongoose.model<IHonorBoardEntry>('HonorBoard', HonorBoardSchema);

export default HonorBoard;
