import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import LessonProgress from '@/lib/db/models/LessonProgress';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'parent') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        const studentId = params.id;
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
        }

        await connectDB();

        // Verify relationship
        const student = await User.findById(studentId).select('linkedParent lastActivityDate').lean();
        if (!student || !student.linkedParent || student.linkedParent.toString() !== payload.userId) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك بالوصول لمعلومات هذا الطالب' }, { status: 403 });
        }

        // Fetch recent lesson activity
        const activities = await LessonProgress.find({ student: studentId })
            .populate('lesson', 'title subject unit')
            .sort({ updatedAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                activities,
                lastLogin: student.lastActivityDate
            }
        });

    } catch (error) {
        console.error('Parent Student Activity GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
