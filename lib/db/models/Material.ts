import mongoose, { Document, Schema } from 'mongoose';

export type MaterialType = 'pdf' | 'notes' | 'homework' | 'worksheet' | 'extra';

export interface IMaterial extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    driveUrl: string;
    type: MaterialType;
    lesson?: mongoose.Types.ObjectId;
    exam?: mongoose.Types.ObjectId;
    grade: string;
    subject?: string;
    isPublished: boolean;
    downloadCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        driveUrl: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['pdf', 'notes', 'homework', 'worksheet', 'extra'],
            required: true,
        },
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
        exam: { type: Schema.Types.ObjectId, ref: 'Exam' },
        grade: { type: String, required: true, index: true },
        subject: { type: String, enum: ['history', 'geography', 'social_studies', 'uncategorized'] },
        isPublished: { type: Boolean, default: false, index: true },
        downloadCount: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

if (mongoose.models.Material) {
    delete mongoose.models.Material;
}
const Material = mongoose.model<IMaterial>('Material', MaterialSchema);
export default Material;
