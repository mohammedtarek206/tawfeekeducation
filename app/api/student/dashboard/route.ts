import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import Notification from '@/lib/db/models/Notification';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

async function handler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select(
        'name points level streak grade isFreeStudent referralCode'
    );
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    // Get lesson progress
    const completedLessons = await LessonProgress.countDocuments({
        student: student.userId,
        isCompleted: true,
    });

    const inProgressLessons = await LessonProgress.countDocuments({
        student: student.userId,
        isCompleted: false,
        watchedPercentage: { $gt: 0 },
    });

    // Get last watched lesson
    const lastProgress = await LessonProgress.findOne({
        student: student.userId,
    })
        .sort({ updatedAt: -1 })
        .populate('lesson', 'title unit lessonNumber thumbnail youtubeId duration grade');

    const lessonsFilter: Record<string, any> = { isPublished: true };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        lessonsFilter.grade = studentUser.grade;
    }
    const totalLessons = await Lesson.countDocuments(lessonsFilter);

    // Get exam stats
    const examAttempts = await ExamAttempt.find({
        student: student.userId,
        status: 'submitted',
    }).select('score percentage passed examType createdAt');

    const avgScore =
        examAttempts.length > 0
            ? Math.round(examAttempts.reduce((sum, a) => sum + a.percentage, 0) / examAttempts.length)
            : 0;

    // Upcoming exams
    const { default: Exam } = await import('@/lib/db/models/Exam');
    const now = new Date();
    const upcomingExamsFilter: Record<string, any> = {
        isPublished: true,
        $or: [{ startDate: { $gt: now } }, { startDate: null }],
        endDate: { $gt: now },
    };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        upcomingExamsFilter.grade = studentUser.grade;
    }
    const upcomingExams = await Exam.find(upcomingExamsFilter)
        .select('title type duration startDate endDate')
        .sort({ startDate: 1 })
        .limit(3)
        .lean();

    // Unread notifications count
    const unreadNotifications = await Notification.countDocuments({
        user: student.userId,
        isRead: false,
    });

    // Recent notifications
    const notifications = await Notification.find({ user: student.userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return NextResponse.json({
        success: true,
        data: {
            student: {
                name: studentUser.name,
                points: studentUser.points,
                level: studentUser.level,
                streak: studentUser.streak,
                grade: studentUser.grade,
                isFreeStudent: studentUser.isFreeStudent,
                referralCode: studentUser.referralCode,
            },
            stats: {
                completedLessons,
                inProgressLessons,
                totalLessons,
                avgScore,
                examCount: examAttempts.length,
            },
            lastLesson: lastProgress?.lesson || null,
            upcomingExams,
            notifications,
            unreadNotifications,
        },
    });
}

export const GET = withStudent(handler);
