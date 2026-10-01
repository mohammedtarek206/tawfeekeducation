import mongoose, { Document, Schema } from 'mongoose';

export interface ISolutionVideo extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    youtubeUrl: string;
    youtubeId?: string;
    thumbnail?: string;
    lesson?: mongoose.Types.ObjectId;
    exam?: mongoose.Types.ObjectId;
    grade: string;
    isPublished: boolean;
    viewCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SolutionVideoSchema = new Schema<ISolutionVideo>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        youtubeUrl: { type: String, required: true, trim: true },
        youtubeId: { type: String, trim: true },
        thumbnail: { type: String },
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
        exam: { type: Schema.Types.ObjectId, ref: 'Exam' },
        grade: { type: String, required: true, index: true },
        isPublished: { type: Boolean, default: false, index: true },
        viewCount: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

SolutionVideoSchema.pre('save', function (next) {
    if (this.youtubeUrl && this.isModified('youtubeUrl')) {
        const match = this.youtubeUrl.match(
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        );
        this.youtubeId = match ? match[1] : undefined;
    }
    next();
});

if (mongoose.models.SolutionVideo) {
    delete mongoose.models.SolutionVideo;
}
const SolutionVideo = mongoose.model<ISolutionVideo>('SolutionVideo', SolutionVideoSchema);
export default SolutionVideo;
