import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'parent') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();

        const parent: any = await User.findById(payload.userId)
            .populate({
                path: 'linkedStudents',
                select: 'name phone grade status subscriptionStatus points level lastActivityDate avatar',
            })
            .lean();

        if (!parent) {
            return NextResponse.json({ success: false, message: 'لم يتم العثور على حسابك' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                students: parent.linkedStudents || []
            }
        });

    } catch (error) {
        console.error('Parent Students GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
