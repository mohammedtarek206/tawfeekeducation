import mongoose, { Document, Schema } from 'mongoose';

export interface IContactSubmission extends Document {
    name: string;
    phone?: string;
    email?: string;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true, maxlength: 2000 },
        isRead: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

const ContactSubmission =
    mongoose.models.ContactSubmission ||
    mongoose.model<IContactSubmission>('ContactSubmission', ContactSubmissionSchema);
export default ContactSubmission;
