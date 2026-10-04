import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Task from '@/lib/db/models/Task';
import { withAdmin } from '@/lib/auth/middleware';

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
    const { title, description, points, grade, subject, targetType, targetCount, isPublished } = body;

    if (!title || !grade) {
        return NextResponse.json({ success: false, message: 'عنوان المهمة والصف الدراسي مطلوبان' }, { status: 400 });
    }

    const newTask = await Task.create({
        title: title.trim(),
        description: description?.trim() || undefined,
        points: Number(points) || 10,
        grade,
        subject: subject || undefined,
        targetType: targetType || 'custom',
        targetCount: Number(targetCount) || 1,
        isPublished: isPublished ?? true,
    });

    return NextResponse.json({ success: true, message: 'تمت إضافة المهمة بنجاح ✅', data: { task: newTask } });
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
