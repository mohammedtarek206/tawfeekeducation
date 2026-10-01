import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import LessonProgress from '@/lib/db/models/LessonProgress';
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

        // Security Check: Is this student actually linked to this parent?
        const student: any = await User.findById(studentId).lean();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
        }

        if (!student.linkedParent || student.linkedParent.toString() !== payload.userId) {
            return NextResponse.json({ success: false, message: 'غير مصرح لك بالوصول لمعلومات هذا الطالب' }, { status: 403 });
        }

        // 1. Completed Lessons Count
        const completedLessonsCount = await LessonProgress.countDocuments({
            student: studentId,
            isCompleted: true
        });

        // 2. Exam Attempts Aggregation
        const exams = await ExamAttempt.find({
            student: studentId,
            status: 'submitted'
        })
            .populate('examRef', 'title subject type')
            .sort({ submittedAt: -1 })
            .lean();

        const quizzesCount = exams.filter(e => e.examType === 'quiz').length;
        const weeklyExamsCount = exams.filter(e => e.examType === 'weekly_exam').length;
        const monthlyExamsCount = exams.filter(e => e.examType === 'monthly_exam').length;

        const totalPercentage = exams.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
        const averageScore = exams.length > 0 ? (totalPercentage / exams.length).toFixed(1) : 0;

        const recentExams = exams.slice(0, 5);

        return NextResponse.json({
            success: true,
            data: {
                overview: {
                    completedLessons: completedLessonsCount,
                    completedQuizzes: quizzesCount,
                    completedWeeklyExams: weeklyExamsCount,
                    completedMonthlyExams: monthlyExamsCount,
                    averageScore: Number(averageScore),
                    points: student.points || 0,
                    level: student.level || 1,
                    subscriptionStatus: student.subscriptionStatus,
                    status: student.status,
                },
                recentExams,
                studentInfo: {
                    name: student.name,
                    grade: student.grade,
                    lastActivityDate: student.lastActivityDate
                }
            }
        });

    } catch (error) {
        console.error('Parent Student Dashboard error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
