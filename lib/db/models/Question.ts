import mongoose, { Document, Schema } from 'mongoose';

export type QuestionType = 'mcq' | 'true_false';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface IChoice {
    text: string;
    isCorrect: boolean;
}

export interface IQuestion extends Document {
    _id: mongoose.Types.ObjectId;
    text: string;
    type: QuestionType;
    choices: IChoice[];
    correctAnswer?: string;
    explanation?: string;
    difficulty: DifficultyLevel;
    subject: string;
    unit?: string;
    lesson?: mongoose.Types.ObjectId;
    grade?: string;
    examId?: mongoose.Types.ObjectId;
    image?: string;
    order: number;
    points: number;
    tags: string[];
    isActive: boolean;
    usageCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ChoiceSchema = new Schema<IChoice>({
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true, default: false },
});

const QuestionSchema = new Schema<IQuestion>(
    {
        text: { type: String, required: true, trim: true },
        type: { type: String, enum: ['mcq', 'true_false'], required: true },
        choices: { type: [ChoiceSchema], required: true },
        explanation: { type: String, trim: true },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        subject: {
            type: String,
            enum: ['history', 'geography', 'social_studies', 'uncategorized', 'رياضيات'],
            required: true,
            trim: true,
            default: 'uncategorized'
        },
        unit: { type: String, trim: true },
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
        grade: { type: String },
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
        image: { type: String, trim: true },
        order: { type: Number, default: 0 },
        points: { type: Number, default: 1 },
        tags: [{ type: String, trim: true }],
        isActive: { type: Boolean, default: true, index: true },
        usageCount: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

QuestionSchema.index({ subject: 1, grade: 1, difficulty: 1 });
QuestionSchema.index({ text: 'text' });

// Clear mongoose cache for hot reloading
if (mongoose.models.Question) {
    delete mongoose.models.Question;
}
const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
export default Question;
