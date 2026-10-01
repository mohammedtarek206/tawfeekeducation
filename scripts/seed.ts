import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function seedAdmin() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not defined in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        const userSchema = new mongoose.Schema({
            name: String,
            phone: String,
            password: { type: String, select: false },
            role: String,
            status: String,
            phoneVerified: Boolean,
        });
        const User = mongoose.models.User || mongoose.model('User', userSchema);

        const adminPhone = process.env.ADMIN_SEED_PHONE || '01000000000';
        const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';
        const adminName = process.env.ADMIN_SEED_NAME || 'مدير المنصة';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ phone: adminPhone, role: 'admin' }).select('+password');

        if (existingAdmin) {
            console.log('⚠️  Admin already exists — re-hashing password to ensure consistency...');
            // Force update the password with 12 rounds (matching the User model)
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);
            await User.updateOne(
                { phone: adminPhone, role: 'admin' },
                { $set: { password: hashedPassword, status: 'approved', phoneVerified: true } }
            );
            console.log('✅ Admin password updated successfully!');
            console.log(`📱 Phone: ${adminPhone}`);
            console.log(`🔑 Password: ${adminPassword}`);
            process.exit(0);
        }

        // Create new admin with 12 salt rounds (matching User model)
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await User.create({
            name: adminName,
            phone: adminPhone,
            password: hashedPassword,
            role: 'admin',
            status: 'approved',
            phoneVerified: true,
        });

        console.log('🎉 Admin created successfully!');
        console.log(`📱 Phone: ${adminPhone}`);
        console.log(`🔑 Password: ${adminPassword}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seedAdmin();
