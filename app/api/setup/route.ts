import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';

// One-time setup endpoint to create/reset admin account
// Protected by a setup key from environment variables
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();
        const { setupKey, phone, password, name } = body;

        // Simple protection — requires a setup key
        const expectedKey = process.env.JWT_SECRET?.slice(0, 16) || 'tawfeek-setup-16';
        if (setupKey !== expectedKey) {
            return NextResponse.json(
                { success: false, message: 'مفتاح الإعداد غير صحيح' },
                { status: 403 }
            );
        }

        await connectDB();

        const adminPhone = phone || process.env.ADMIN_SEED_PHONE || '01000000000';
        const adminPassword = password || process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';
        const adminName = name || process.env.ADMIN_SEED_NAME || 'مدير المنصة';

        // Hash password with 12 rounds (matching User model)
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const existing = await User.findOne({ phone: adminPhone, role: 'admin' });

        if (existing) {
            // Force update password
            await User.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        password: hashedPassword,
                        status: 'approved',
                        phoneVerified: true,
                        name: adminName,
                    },
                }
            );
            return NextResponse.json({
                success: true,
                message: `✅ تم تحديث كلمة مرور الأدمن بنجاح`,
                data: { phone: adminPhone, name: adminName },
            });
        }

        await User.create({
            name: adminName,
            phone: adminPhone,
            password: hashedPassword,
            role: 'admin',
            status: 'approved',
            phoneVerified: true,
            points: 0,
            level: 1,
            streak: 0,
        });

        return NextResponse.json({
            success: true,
            message: `🎉 تم إنشاء حساب الأدمن بنجاح`,
            data: { phone: adminPhone, name: adminName },
        });
    } catch (error: any) {
        console.error('Setup error:', error);
        return NextResponse.json(
            { success: false, message: `خطأ: ${error.message}` },
            { status: 500 }
        );
    }
}
