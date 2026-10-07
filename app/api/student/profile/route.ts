import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Subscription from '@/lib/db/models/Subscription';
import Lesson from '@/lib/db/models/Lesson';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import StudentAchievement from '@/lib/db/models/StudentAchievement';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

export const revalidate = 0;

// GET /api/student/profile
async function getHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const student = await User.findById(studentPayload.userId).lean() as any;
    if (!student) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    // Subscriptions list
    const subscriptions = await Subscription.find({ studentId: student._id })
        .populate('planId')
        .sort({ createdAt: -1 })
        .lean();

    // Lessons progress
    const totalLessons = await Lesson.countDocuments({ grade: student.grade, isPublished: true });
    const completedProgresses = await LessonProgress.find({ student: student._id, isCompleted: true }).lean();
    const completedLessonsCount = completedProgresses.length;
    const progressPercentage = totalLessons > 0 ? Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100)) : 0;

    // Exam attempts stats
    const attempts = await ExamAttempt.find({ studentId: student._id, status: 'completed' }).lean() as any[];
    const totalExamsSolved = attempts.length;
    let avgScore = 0;
    if (attempts.length > 0) {
        const sumPercentage = attempts.reduce((acc, curr) => {
            const percentage = curr.totalPoints > 0 ? (curr.score / curr.totalPoints) * 100 : 0;
            return acc + percentage;
        }, 0);
        avgScore = Math.round(sumPercentage / attempts.length);
    }

    // Achievements count
    const achievementsCount = await StudentAchievement.countDocuments({ studentId: student._id });

    // Enrolled Lessons
    const lessons = await Lesson.find({ grade: student.grade, isPublished: true })
        .sort({ order: 1 })
        .select('title unit lessonNumber isFree points youtubeId')
        .lean();

    const completedLessonIds = new Set(completedProgresses.map((p) => p.lesson.toString()));
    const enrolledLessonsWithProgress = lessons.map((l: any) => ({
        ...l,
        isCompleted: completedLessonIds.has(l._id.toString()),
    }));

    return NextResponse.json({
        success: true,
        data: {
            user: {
                _id: student._id,
                name: student.name,
                phone: student.phone,
                grade: student.grade,
                status: student.status,
                subscriptionStatus: student.subscriptionStatus,
                isFreeStudent: Boolean(student.isFreeStudent),
                freeSlotNumber: student.freeSlotNumber,
                points: student.points || 0,
                level: student.level || 1,
                streak: student.streak || 0,
                createdAt: student.createdAt,
                lastActivityDate: student.lastActivityDate,
            },
            subscriptions,
            progress: {
                totalLessons,
                completedLessonsCount,
                progressPercentage,
                totalExamsSolved,
                avgScore,
                achievementsCount,
            },
            enrolledLessons: enrolledLessonsWithProgress,
        },
    });
}

// PUT /api/student/profile - ONLY allows editing Name!
async function putHandler(req: NextRequest, _ctx: unknown, studentPayload: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, message: 'الاسم مطلوب' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
        return NextResponse.json({ success: false, message: 'الاسم يجب ألا يتجاوز 100 حرف' }, { status: 400 });
    }

    // Strictly update name ONLY
    const updatedStudent = await User.findByIdAndUpdate(
        studentPayload.userId,
        { $set: { name: trimmedName } },
        { new: true }
    ).select('name phone grade status subscriptionStatus points level createdAt');

    if (!updatedStudent) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        message: 'تم تحديث الاسم بنجاح',
        data: { user: updatedStudent },
    });
}

export const GET = withStudent(getHandler);
export const PUT = withStudent(putHandler);
