import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Achievement from '@/lib/db/models/Achievement';
import { withAdmin } from '@/lib/auth/middleware';

async function getHandler(): Promise<NextResponse> {
    await connectDB();
    const achievements = await Achievement.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: { achievements } });
}

async function postHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const { title, description, icon, category, requiredCount, pointsReward, badgeColor, isPublished } = body;

    if (!title || !description) {
        return NextResponse.json({ success: false, message: 'عنوان ووصف الإنجاز مطلوبان' }, { status: 400 });
    }

    const newAch = await Achievement.create({
        title: title.trim(),
        description: description.trim(),
        icon: icon || '🏆',
        category: category || 'general',
        requiredCount: Number(requiredCount) || 1,
        pointsReward: Number(pointsReward) || 50,
        badgeColor: badgeColor || '#F59E0B',
        isPublished: isPublished ?? true,
    });

    return NextResponse.json({ success: true, message: 'تمت إضافة الإنجاز بنجاح ✅', data: { achievement: newAch } });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
