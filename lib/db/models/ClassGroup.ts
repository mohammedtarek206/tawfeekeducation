import mongoose, { Document, Schema } from 'mongoose';

export type DayOfWeek =
    | 'saturday'
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday';

export interface IClassGroup extends Document {
    branch: mongoose.Types.ObjectId;
    subject: string;
    grade: string;
    name: string;
    teacherName?: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    capacity: number;
    enrolledCount: number;
    isActive: boolean;
    createdAt: Date;
}

const ClassGroupSchema = new Schema<IClassGroup>(
    {
        branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
        subject: { type: String, required: true, trim: true },
        grade: { type: String, required: true, index: true },
        name: { type: String, required: true, trim: true },
        teacherName: { type: String, trim: true },
        day: {
            type: String,
            enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            required: true,
        },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        capacity: { type: Number, required: true, min: 1 },
        enrolledCount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const ClassGroup =
    mongoose.models.ClassGroup || mongoose.model<IClassGroup>('ClassGroup', ClassGroupSchema);
export default ClassGroup;
