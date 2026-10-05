import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentAchievement extends Document {
    student: mongoose.Types.ObjectId;
    achievement: mongoose.Types.ObjectId;
    earnedAt: Date;
    pointsEarned: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentAchievementSchema = new Schema<IStudentAchievement>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        achievement: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true, index: true },
        earnedAt: { type: Date, default: Date.now },
        pointsEarned: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Prevent duplicate achievement per student
StudentAchievementSchema.index({ student: 1, achievement: 1 }, { unique: true });

const StudentAchievement = mongoose.models.StudentAchievement || mongoose.model<IStudentAchievement>('StudentAchievement', StudentAchievementSchema);
export default StudentAchievement;
