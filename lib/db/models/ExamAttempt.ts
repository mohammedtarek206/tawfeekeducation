import mongoose, { Document, Schema } from 'mongoose';

export type AttemptType = 'quiz' | 'weekly_exam' | 'monthly_exam';
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired';

export interface IAnswerRecord {
    questionId: mongoose.Types.ObjectId;
    selectedChoiceIndex: number;
    isCorrect: boolean;
    pointsEarned: number;
}

export interface IExamAttempt extends Document {
    student: mongoose.Types.ObjectId;
    examRef: mongoose.Types.ObjectId;
    examType: AttemptType;
    status: AttemptStatus;
    answers: IAnswerRecord[];
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    pointsAwarded: boolean;
    earnedPoints: number;
    startedAt: Date;
    submittedAt?: Date;
    timeSpent: number;
    attemptNumber: number;
    serverEndTime: Date;
    createdAt: Date;
}

const AnswerRecordSchema = new Schema<IAnswerRecord>({
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedChoiceIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    pointsEarned: { type: Number, required: true },
});

const ExamAttemptSchema = new Schema<IExamAttempt>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        examRef: { type: Schema.Types.ObjectId, required: true, index: true },
        examType: { type: String, enum: ['quiz', 'weekly_exam', 'monthly_exam'], required: true },
        status: {
            type: String,
            enum: ['in_progress', 'submitted', 'expired'],
            default: 'in_progress',
            index: true,
        },
        answers: [AnswerRecordSchema],
        score: { type: Number, default: 0 },
        totalPoints: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
        pointsAwarded: { type: Boolean, default: false },
        earnedPoints: { type: Number, default: 0 },
        startedAt: { type: Date, default: Date.now },
        submittedAt: { type: Date },
        timeSpent: { type: Number, default: 0 },
        attemptNumber: { type: Number, default: 1 },
        serverEndTime: { type: Date, required: true },
    },
    { timestamps: true }
);

ExamAttemptSchema.index({ student: 1, examRef: 1, examType: 1 });

const ExamAttempt =
    mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
export default ExamAttempt;
