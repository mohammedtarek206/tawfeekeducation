import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
    key: string;
    value: string | number | boolean | object;
    type: 'string' | 'number' | 'boolean' | 'json';
    category: string;
    description?: string;
    updatedBy?: mongoose.Types.ObjectId;
    updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: Schema.Types.Mixed, required: true },
        type: { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
        category: { type: String, required: true, default: 'general', index: true },
        description: { type: String },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

const Settings =
    mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
export default Settings;
