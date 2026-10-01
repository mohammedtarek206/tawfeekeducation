import mongoose, { Document, Schema } from 'mongoose';

export interface ILevel extends Document {
    levelNumber: number;
    name: string;
    nameEn?: string;
    requiredPoints: number;
    badge?: string;
    color?: string;
    isActive: boolean;
    createdAt: Date;
}

const LevelSchema = new Schema<ILevel>(
    {
        levelNumber: { type: Number, required: true, unique: true },
        name: { type: String, required: true, trim: true },
        nameEn: { type: String, trim: true },
        requiredPoints: { type: Number, required: true },
        badge: { type: String },
        color: { type: String, default: '#1B5E20' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Level = mongoose.models.Level || mongoose.model<ILevel>('Level', LevelSchema);
export default Level;
