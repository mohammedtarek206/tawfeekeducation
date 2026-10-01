import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'student' | 'parent' | 'admin';
export type StudentStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    password: string;
    role: UserRole;
    status: StudentStatus;
    subscriptionStatus: 'free' | 'pending' | 'active' | 'expired' | 'rejected' | 'none';
    currentPlan?: mongoose.Types.ObjectId;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    rejectionReason?: string;
    phoneVerified: boolean;
    isFreeStudent: boolean;
    freeSlotNumber?: number;
    avatar?: string;
    grade?: string;
    governorate?: string;
    parentName?: string;
    parentPhone?: string;
    referralCode?: string;
    referredBy?: mongoose.Types.ObjectId;
    points: number;
    level: number;
    streak: number;
    lastActivityDate?: Date;
    linkedStudents?: mongoose.Types.ObjectId[];
    linkedParent?: mongoose.Types.ObjectId;
    parentLinkingCode?: string;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: [/^01[0-9]{9}$/, 'رقم الهاتف غير صحيح'],
            index: true,
        },
        password: { type: String, required: true, minlength: 8, select: false },
        role: { type: String, enum: ['student', 'parent', 'admin'], required: true, index: true },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'suspended'],
            default: 'pending',
            index: true,
        },
        rejectionReason: { type: String, trim: true },
        subscriptionStatus: {
            type: String,
            enum: ['free', 'pending', 'active', 'expired', 'rejected', 'none'],
            default: 'none',
        },
        currentPlan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        subscriptionStartDate: { type: Date },
        subscriptionEndDate: { type: Date },
        phoneVerified: { type: Boolean, default: false },
        isFreeStudent: { type: Boolean, default: false, index: true },
        freeSlotNumber: { type: Number },
        avatar: { type: String },
        grade: {
            type: String,
            enum: ['first_secondary', 'second_secondary', 'third_secondary', 'third_preparatory', 'second_secondary_baccalaureate', ''],
        },
        governorate: { type: String, trim: true },
        parentName: { type: String, trim: true },
        parentPhone: { type: String, trim: true },
        referralCode: { type: String, unique: true, sparse: true, index: true },
        referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
        points: { type: Number, default: 0, min: 0 },
        level: { type: Number, default: 1 },
        streak: { type: Number, default: 0 },
        lastActivityDate: { type: Date },
        linkedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        linkedParent: { type: Schema.Types.ObjectId, ref: 'User' },
        parentLinkingCode: { type: String, unique: true, sparse: true, index: true },
        lastLogin: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.set('toJSON', {
    transform: (_doc, ret) => {
        delete (ret as any).password;
        return ret;
    },
});

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
