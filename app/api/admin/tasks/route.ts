import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Task from '@/lib/db/models/Task';
import { withAdmin } from '@/lib/auth/middleware';
import mongoose from 'mongoose';

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get('grade') || '';
    const subject = searchParams.get('subject') || '';

    const filter: Record<string, unknown> = {};
    if (grade && grade !== 'all') filter.grade = grade;
    if (subject && subject !== 'all') filter.subject = subject;

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: { tasks } });
}

async function postHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const {
        title, description, points, grade, subject, targetType, targetCount, isPublished,
        isMandatory, link, targetAudience, specificStudents, endDate
    } = body;

    if (!title) {
        return NextResponse.json({ success: false, message: 'عنوان المهمة مطلوب' }, { status: 400 });
    }

    let specificStudentIds: mongoose.Types.ObjectId[] = [];
    if (targetAudience === 'specific_students' && typeof specificStudents === 'string') {
        const items = specificStudents.split(',').map((s) => s.trim()).filter(Boolean);
        const phones = items.filter((s) => /^01[0-9]{9}$/.test(s));
        const customIds = items.filter((s) => mongoose.Types.ObjectId.isValid(s));

        if (phones.length > 0 || customIds.length > 0) {
            const { default: User } = await import('@/lib/db/models/User');
            const users = await User.find({
                $or: [
                    { phone: { $in: phones } },
                    { _id: { $in: customIds } }
                ]
            }).select('_id');
            specificStudentIds = users.map(u => u._id);
        }
    }

    const newTask = await Task.create({
        title: title.trim(),
        description: description?.trim() || undefined,
        points: Number(points) || 10,
        grade: grade || undefined,
        subject: subject || undefined,
        targetType: targetType || 'custom',
        targetCount: Number(targetCount) || 1,
        isPublished: isPublished ?? true,
        isMandatory: isMandatory ?? true,
        link: link?.trim() || undefined,
        targetAudience: targetAudience || 'grade',
        specificStudents: specificStudentIds,
        endDate: endDate ? new Date(endDate) : undefined,
    });

    // Send notifications to targeted students (non-blocking)
    if (newTask.isPublished) {
        notifyStudentsAboutTask(newTask).catch(() => { });
    }

    return NextResponse.json({ success: true, message: 'تمت إضافة المهمة بنجاح ✅', data: { task: newTask } });
}

async function notifyStudentsAboutTask(task: any) {
    try {
        const { default: User } = await import('@/lib/db/models/User');
        const { default: Notification } = await import('@/lib/db/models/Notification');

        let studentFilter: Record<string, any> = { role: 'student', status: 'approved' };

        if (task.targetAudience === 'grade' && task.grade) {
            studentFilter.grade = task.grade;
        } else if (task.targetAudience === 'specific_students' && task.specificStudents?.length) {
            studentFilter._id = { $in: task.specificStudents };
        } else if (task.targetAudience === 'subject' && task.subject) {
            // Notify all approved students (subject-based)
        }
        // 'all' = no extra filter

        const students = await User.find(studentFilter).select('_id').lean();
        const notifications = students.map((s: any) => ({
            user: s._id,
            type: 'task',
            title: `🎯 مهمة جديدة: ${task.title}`,
            message: task.description || 'راجع مهامك الجديدة في لوحة التحكم',
            isRead: false,
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications, { ordered: false });
        }
    } catch { /* silent */ }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
