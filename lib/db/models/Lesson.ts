import mongoose, { Document, Schema } from 'mongoose';

export interface ILesson extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    lessonNumber: number;
    unit: string;
    subject: string;
    description: string;
    thumbnail?: string;
    youtubeUrl?: string;
    youtubeId?: string;
    duration?: number;
    grade: string;
    points: number;
    completionThreshold: number;
    isPublished: boolean;
    isFree: boolean;
    showOnHomepage: boolean;
    publishDate?: Date;
    homeworkDescription?: string;
    quiz?: mongoose.Types.ObjectId;
    materials: mongoose.Types.ObjectId[];
    order: number;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
    {
        title: { type: String, required: true, trim: true },
        lessonNumber: { type: Number, required: true },
        unit: { type: String, required: true, trim: true },
        subject: {
            type: String,
            enum: ['history', 'geography', 'social_studies', 'uncategorized', 'رياضيات'],
            required: true,
            trim: true,
            default: 'uncategorized'
        },
        description: { type: String, trim: true },
        thumbnail: { type: String },
        youtubeUrl: { type: String, trim: true },
        youtubeId: { type: String, trim: true },
        duration: { type: Number },
        grade: { type: String, required: true, index: true },
        points: { type: Number, default: 10 },
        completionThreshold: { type: Number, default: 90 },
        isPublished: { type: Boolean, default: false, index: true },
        isFree: { type: Boolean, default: false },
        showOnHomepage: { type: Boolean, default: false },
        publishDate: { type: Date },
        homeworkDescription: { type: String, trim: true },
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        materials: [{ type: Schema.Types.ObjectId, ref: 'Material' }],
        order: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

LessonSchema.index({ grade: 1, isPublished: 1, order: 1 });
LessonSchema.index({ title: 'text', description: 'text' });

// Extract YouTube ID from URL
LessonSchema.pre('save', function (next) {
    if (this.youtubeUrl && this.isModified('youtubeUrl')) {
        const match = this.youtubeUrl.match(
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        );
        this.youtubeId = match ? match[1] : undefined;
    }
    next();
});

if (mongoose.models.Lesson) {
    delete mongoose.models.Lesson;
}
const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
