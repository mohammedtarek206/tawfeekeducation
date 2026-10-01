import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        const query: any = { role: 'parent' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const parents = await User.find(query)
            .populate({
                path: 'linkedStudents',
                select: 'name phone grade'
            })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                parents
            }
        });
    } catch (error) {
        console.error('Admin Parents GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
