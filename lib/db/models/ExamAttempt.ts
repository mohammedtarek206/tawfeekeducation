import mongoose, { Document, Schema } from 'mongoose';

export type AttemptType = 'quiz' | 'weekly_exam' | 'monthly_exam' | 'practice';
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired';
export type EssayGradingStatus = 'pending' | 'graded';

export interface IAnswerRecord {
    questionId: mongoose.Types.ObjectId;
    selectedChoiceIndex: number;   // -1 for essay questions
    isCorrect: boolean;
    pointsEarned: number;
    // Essay-question-specific fields
    essayAnswer?: string;          // Student's written answer
    gradingStatus?: EssayGradingStatus; // pending | graded
    gradedBy?: mongoose.Types.ObjectId; // Admin who graded
    gradedAt?: Date;
    gradingNotes?: string;         // Admin's feedback
}

export interface IExamAttempt extends Document {
    student: mongoose.Types.ObjectId;
    examRef?: mongoose.Types.ObjectId;
    examType: AttemptType;
    status: AttemptStatus;
    answers: IAnswerRecord[];
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    pointsAwarded: boolean;
    earnedPoints: number;
    hasUngradedEssays: boolean;    // true when essay answers await grading
    startedAt: Date;
    submittedAt?: Date;
    timeSpent: number;
    attemptNumber: number;
    serverEndTime?: Date;
    createdAt: Date;
}

const AnswerRecordSchema = new Schema<IAnswerRecord>({
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedChoiceIndex: { type: Number, default: -1 },
    isCorrect: { type: Boolean, required: true },
    pointsEarned: { type: Number, required: true },
    essayAnswer: { type: String, trim: true },
    gradingStatus: { type: String, enum: ['pending', 'graded'], default: 'graded' },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    gradingNotes: { type: String, trim: true },
});

const ExamAttemptSchema = new Schema<IExamAttempt>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        examRef: { type: Schema.Types.ObjectId, ref: 'Exam', required: false, index: true },
        examType: {
            type: String,
            enum: ['quiz', 'weekly_exam', 'monthly_exam', 'practice'],
            required: true,
            index: true
        },
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
        hasUngradedEssays: { type: Boolean, default: false, index: true },
        startedAt: { type: Date, default: Date.now },
        submittedAt: { type: Date },
        timeSpent: { type: Number, default: 0 },
        attemptNumber: { type: Number, default: 1 },
        serverEndTime: { type: Date },
    },
    { timestamps: true }
);

ExamAttemptSchema.index({ student: 1, examRef: 1, examType: 1 });

if (mongoose.models.ExamAttempt) {
    delete mongoose.models.ExamAttempt;
}
const ExamAttempt = mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
export default ExamAttempt;
