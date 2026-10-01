import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    lesson?: mongoose.Types.ObjectId;
    grade: string;
    questions: mongoose.Types.ObjectId[];
    timeLimit?: number;
    passingScore: number;
    maxAttempts: number;
    points: number;
    bonusPoints: number;
    bonusThreshold: number;
    isPublished: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
        grade: { type: String, required: true, index: true },
        questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
        timeLimit: { type: Number },
        passingScore: { type: Number, default: 50 },
        maxAttempts: { type: Number, default: 3 },
        points: { type: Number, default: 10 },
        bonusPoints: { type: Number, default: 5 },
        bonusThreshold: { type: Number, default: 90 },
        isPublished: { type: Boolean, default: false, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
export default Quiz;
