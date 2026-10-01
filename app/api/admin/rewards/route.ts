import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Reward from '@/lib/db/models/Reward';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

async function getHandler(): Promise<NextResponse> {
    await connectDB();
    const rewards = await Reward.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: { rewards } });
}

async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const { name, description, requiredPoints, quantity, category } = body;

    if (!name || !requiredPoints) {
        return NextResponse.json({ success: false, message: 'الاسم والتكلفة بالنقاط مطلوبان' }, { status: 400 });
    }

    const reward = await Reward.create({
        name,
        description: description || '',
        requiredPoints: Number(requiredPoints),
        quantity: Number(quantity ?? 0),
        category: category || 'gift',
        isActive: true,
        createdBy: admin.userId,
    });

    return NextResponse.json({ success: true, data: { reward } }, { status: 201 });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
