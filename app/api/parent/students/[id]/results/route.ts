import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
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
        const student = await User.findById(studentId).select('linkedParent').lean();
        if (!student || !student.linkedParent || student.linkedParent.toString() !== payload.userId) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك بالوصول لمعلومات هذا الطالب' }, { status: 403 });
        }

        // Fetch Exam Attempts
        const exams = await ExamAttempt.find({
            student: studentId,
            status: 'submitted'
        })
            .populate('examRef', 'title subject type')
            .sort({ submittedAt: -1 })
            .lean();

        // Group by type for better UI structure
        const results = {
            quizzes: exams.filter(e => e.examType === 'quiz'),
            weekly: exams.filter(e => e.examType === 'weekly_exam'),
            monthly: exams.filter(e => e.examType === 'monthly_exam'),
        };

        return NextResponse.json({
            success: true,
            data: { results }
        });

    } catch (error) {
        console.error('Parent Student Results GET error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
