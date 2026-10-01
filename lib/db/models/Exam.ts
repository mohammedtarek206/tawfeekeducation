import mongoose, { Document, Schema } from 'mongoose';

export type ExamType = 'quiz' | 'weekly' | 'monthly';

export interface IExam extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    type: ExamType;
    grade: string;
    subject?: string;
    questions: mongoose.Types.ObjectId[];
    duration: number;
    startDate?: Date;
    endDate?: Date;
    maxAttempts: number;
    totalPoints: number;
    passingScore: number;
    isPublished: boolean;
    isFree: boolean;
    showResultImmediately: boolean;
    lessonId?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        type: { type: String, enum: ['quiz', 'weekly', 'monthly'], required: true, index: true },
        grade: { type: String, required: true, index: true },
        subject: { type: String, enum: ['history', 'geography', 'social_studies', 'uncategorized'] },
        questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
        duration: { type: Number, required: true },
        startDate: { type: Date, index: true },
        endDate: { type: Date, index: true },
        maxAttempts: { type: Number, default: 1 },
        totalPoints: { type: Number, default: 0 },
        passingScore: { type: Number, default: 50 },
        isPublished: { type: Boolean, default: false, index: true },
        isFree: { type: Boolean, default: false },
        showResultImmediately: { type: Boolean, default: true },
        lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

ExamSchema.index({ grade: 1, isPublished: 1, startDate: 1 });

if (mongoose.models.Exam) {
    delete mongoose.models.Exam;
}
const Exam = mongoose.model<IExam>('Exam', ExamSchema);
export default Exam;
