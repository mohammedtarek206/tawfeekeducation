import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentTask extends Document {
    student: mongoose.Types.ObjectId;
    task: mongoose.Types.ObjectId;
    status: 'in_progress' | 'completed' | 'overdue';
    completedAt?: Date;
    pointsEarned: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentTaskSchema = new Schema<IStudentTask>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
        status: { type: String, enum: ['in_progress', 'completed', 'overdue'], default: 'completed' },
        completedAt: { type: Date, default: Date.now },
        pointsEarned: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Prevent duplicate task completion
StudentTaskSchema.index({ student: 1, task: 1 }, { unique: true });

const StudentTask = mongoose.models.StudentTask || mongoose.model<IStudentTask>('StudentTask', StudentTaskSchema);
export default StudentTask;
