import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    title: string;
    description?: string;
    points: number;
    grade?: string; // Optional if targetAudience is 'all'
    subject?: string;
    targetType: 'watch_lesson' | 'solve_exam' | 'login_streak' | 'custom';
    targetCount: number;
    isPublished: boolean;
    isMandatory: boolean;
    link?: string;
    targetAudience: 'all' | 'grade' | 'subject' | 'specific_students';
    specificStudents: mongoose.Types.ObjectId[];
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        points: { type: Number, default: 10, min: 0 },
        grade: { type: String, index: true },
        subject: { type: String, index: true },
        targetType: {
            type: String,
            enum: ['watch_lesson', 'solve_exam', 'login_streak', 'custom'],
            default: 'custom',
        },
        targetCount: { type: Number, default: 1, min: 1 },
        isPublished: { type: Boolean, default: true, index: true },
        isMandatory: { type: Boolean, default: true },
        link: { type: String },
        targetAudience: {
            type: String,
            enum: ['all', 'grade', 'subject', 'specific_students'],
            default: 'grade',
            index: true,
        },
        specificStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        startDate: { type: Date },
        endDate: { type: Date },
    },
    { timestamps: true }
);

const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export default Task;
