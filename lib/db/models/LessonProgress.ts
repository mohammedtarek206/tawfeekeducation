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
    /**
     * Watched segments stored as [startSeconds, endSeconds] pairs.
     * Used to calculate true watched percentage without double-counting.
     * Example: [[0, 60], [120, 300]] means 0-60s and 120-300s were watched.
     */
    watchedSegments: Array<[number, number]>;
    /** Total unique seconds watched (computed from merged segments) */
    uniqueSecondsWatched: number;
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
        watchedSegments: { type: [[Number]], default: [] },
        uniqueSecondsWatched: { type: Number, default: 0 },
    },
    { timestamps: true }
);

LessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
LessonProgressSchema.index({ student: 1, isCompleted: 1 });

const LessonProgress =
    mongoose.models.LessonProgress ||
    mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema);
export default LessonProgress;
