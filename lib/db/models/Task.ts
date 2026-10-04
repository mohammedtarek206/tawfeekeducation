import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    title: string;
    description?: string;
    points: number;
    grade: string;
    subject?: string;
    targetType: 'watch_lesson' | 'solve_exam' | 'login_streak' | 'custom';
    targetCount: number;
    isPublished: boolean;
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
        grade: { type: String, required: true, index: true },
        subject: { type: String, index: true },
        targetType: {
            type: String,
            enum: ['watch_lesson', 'solve_exam', 'login_streak', 'custom'],
            default: 'custom',
        },
        targetCount: { type: Number, default: 1, min: 1 },
        isPublished: { type: Boolean, default: true, index: true },
        startDate: { type: Date },
        endDate: { type: Date },
    },
    { timestamps: true }
);

const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export default Task;
