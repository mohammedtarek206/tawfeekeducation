import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IOTP extends Document {
    phone: string;
    otpHash: string;
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    requestCount: number;
    lastRequestAt: Date;
    ipAddress?: string;
    createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
    {
        phone: { type: String, required: true, index: true },
        otpHash: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
        verified: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        requestCount: { type: Number, default: 1 },
        lastRequestAt: { type: Date, default: Date.now },
        ipAddress: { type: String },
    },
    { timestamps: true }
);

OTPSchema.statics.hashOTP = (otp: string): string => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

OTPSchema.statics.generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const OTP = mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);
export default OTP;
