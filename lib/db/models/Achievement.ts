import mongoose, { Document, Schema } from 'mongoose';

export interface IAchievement extends Document {
    title: string;
    description: string;
    icon: string;
    category: 'lessons' | 'exams' | 'streak' | 'points' | 'general';
    requiredCount: number;
    pointsReward: number;
    badgeColor: string;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        icon: { type: String, default: '🏆' },
        category: {
            type: String,
            enum: ['lessons', 'exams', 'streak', 'points', 'general'],
            default: 'general',
            index: true,
        },
        requiredCount: { type: Number, default: 1, min: 1 },
        pointsReward: { type: Number, default: 50, min: 0 },
        badgeColor: { type: String, default: '#F59E0B' },
        isPublished: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const Achievement =
    mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
export default Achievement;
