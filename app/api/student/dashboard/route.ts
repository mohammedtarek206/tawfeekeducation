import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import Notification from '@/lib/db/models/Notification';
import Task from '@/lib/db/models/Task';
import StudentTask from '@/lib/db/models/StudentTask';
import Achievement from '@/lib/db/models/Achievement';
import StudentAchievement from '@/lib/db/models/StudentAchievement';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';

async function handler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select(
        'name points level streak grade isFreeStudent subscriptionStatus subscriptionEndDate status referralCode parentLinkingCode'
    );
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    // Ensure legacy students have a linking code
    if (!studentUser.parentLinkingCode) {
        studentUser.parentLinkingCode = 'TWF-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        await studentUser.save();
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
    const lastProgress = await LessonProgress.findOne({ student: student.userId })
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

    // ---- TASKS SUMMARY ----
    const audienceQuery = {
        $or: [
            { targetAudience: 'all' },
            { targetAudience: 'grade', grade: studentUser.grade },
            { targetAudience: 'subject' },
            { targetAudience: 'specific_students', specificStudents: student.userId },
        ]
    };
    const allTasks = await Task.find({ isPublished: true, ...audienceQuery })
        .sort({ endDate: 1, createdAt: -1 })
        .limit(5)
        .lean() as any[];

    const taskCompletions = await StudentTask.find({ student: student.userId }).select('task').lean() as any[];
    const completedTaskIds = new Set(taskCompletions.map((c: any) => c.task.toString()));

    const tasksWithStatus = allTasks.map((t: any) => {
        let status: string = 'new';
        if (completedTaskIds.has(t._id.toString())) status = 'completed';
        else if (t.endDate && new Date(t.endDate) < now) status = 'overdue';
        return { ...t, status, isCompleted: completedTaskIds.has(t._id.toString()) };
    });

    const taskSummary = {
        total: allTasks.length,
        new: tasksWithStatus.filter(t => t.status === 'new').length,
        completed: tasksWithStatus.filter(t => t.status === 'completed').length,
        overdue: tasksWithStatus.filter(t => t.status === 'overdue').length,
        latest: tasksWithStatus.slice(0, 3),
    };

    // ---- ACHIEVEMENTS SUMMARY ----
    const earnedAchievements = await StudentAchievement.find({ student: student.userId })
        .populate('achievement', 'title icon badgeColor pointsReward')
        .sort({ earnedAt: -1 })
        .limit(4)
        .lean() as any[];

    const totalAchievementsCount = await Achievement.countDocuments({ isPublished: true });
    const achievementSummary = {
        totalAvailable: totalAchievementsCount,
        earned: earnedAchievements.length,
        latest: earnedAchievements.map((e: any) => e.achievement).filter(Boolean),
    };

    // Check subscription access for dashboard badge
    const accessCheck = await checkStudentAccess(student.userId);
    const hasActiveSubscription = accessCheck.canAccess || accessCheck.reason === 'content_is_free';
    const subscriptionReason = accessCheck.reason;

    return NextResponse.json({
        success: true,
        data: {
            student: {
                name: studentUser.name,
                points: studentUser.points,
                level: studentUser.level,
                streak: studentUser.streak,
                grade: studentUser.grade,
                isFreeStudent: Boolean(studentUser.isFreeStudent),
                subscriptionStatus: studentUser.subscriptionStatus,
                subscriptionEndDate: studentUser.subscriptionEndDate,
                status: studentUser.status,
                referralCode: studentUser.referralCode,
                parentLinkingCode: studentUser.parentLinkingCode,
                hasActiveSubscription,
                subscriptionReason,
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
            taskSummary,
            achievementSummary,
        },
    });
}

export const GET = withStudent(handler);
