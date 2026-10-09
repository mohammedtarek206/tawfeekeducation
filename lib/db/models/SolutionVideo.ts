import mongoose, { Document, Schema } from 'mongoose';

export interface ISolutionVideo extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    youtubeUrl: string;
    youtubeId?: string;
    videoProvider?: 'youtube' | 'dailymotion' | 'vimeo' | 'drive' | 'direct' | 'other';
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
        videoProvider: {
            type: String,
            enum: ['youtube', 'dailymotion', 'vimeo', 'drive', 'direct', 'other'],
            default: 'youtube',
        },
        thumbnail: { type: String },
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
        exam: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
        grade: { type: String, required: true, index: true },
        isPublished: { type: Boolean, default: false, index: true },
        viewCount: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

SolutionVideoSchema.pre('save', function (next) {
    if (this.youtubeUrl && this.isModified('youtubeUrl')) {
        const url = this.youtubeUrl.trim();
        // YouTube regex
        const ytMatch = url.match(
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        );

        if (ytMatch) {
            this.youtubeId = ytMatch[1];
            this.videoProvider = 'youtube';
        } else if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
            this.videoProvider = 'dailymotion';
            const dmMatch = url.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/|video=)([a-zA-Z0-9]+)/);
            if (dmMatch) this.youtubeId = dmMatch[1];
        } else if (url.includes('drive.google.com')) {
            this.videoProvider = 'drive';
        } else if (url.endsWith('.mp4') || url.endsWith('.webm')) {
            this.videoProvider = 'direct';
        } else {
            this.videoProvider = 'other';
        }
    }
    next();
});

if (mongoose.models.SolutionVideo) {
    delete mongoose.models.SolutionVideo;
}
const SolutionVideo = mongoose.model<ISolutionVideo>('SolutionVideo', SolutionVideoSchema);
export default SolutionVideo;

