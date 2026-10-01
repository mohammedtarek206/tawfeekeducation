import mongoose, { Document, Schema } from 'mongoose';

export interface ILessonProgress extends Document {
    student: mongoose.Types.ObjectId;
    lesson: mongoose.Types.ObjectId;
    watchedPercentage: number;
    lastWatchedPosition: number;
    isCompleted: boolean;
    completedAt?: Date;
    pointsAwarded: boolean;
    watchSessions: number;
    totalWatchTime: number;
    createdAt: Date;
    updatedAt: Date;
}

const LessonProgressSchema = new Schema<ILessonProgress>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
        watchedPercentage: { type: Number, default: 0, min: 0, max: 100 },
        lastWatchedPosition: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
        pointsAwarded: { type: Boolean, default: false },
        watchSessions: { type: Number, default: 0 },
        totalWatchTime: { type: Number, default: 0 },
    },
    { timestamps: true }
);

LessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
LessonProgressSchema.index({ student: 1, isCompleted: 1 });

const LessonProgress =
    mongoose.models.LessonProgress ||
    mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema);
export default LessonProgress;
