import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Task from '@/lib/db/models/Task';
import StudentTask from '@/lib/db/models/StudentTask';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { checkAndAwardAchievements } from '@/lib/utils/achievements';

async function handler(
    _req: NextRequest,
    ctx: unknown,
    student: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const params = (ctx as { params: { id: string } }).params;
    const taskId = params.id;

    // Check task exists
    const task = await Task.findById(taskId).lean() as any;
    if (!task || !task.isPublished) {
        return NextResponse.json({ success: false, message: 'المهمة غير موجودة' }, { status: 404 });
    }

    const now = new Date();

    // Check if task is overdue
    if (task.endDate && new Date(task.endDate) < now) {
        return NextResponse.json({
            success: false,
            message: 'انتهى الموعد النهائي لهذه المهمة'
        }, { status: 400 });
    }

    // Idempotent – check if already completed
    const existing = await StudentTask.findOne({ student: student.userId, task: taskId });
    if (existing) {
        return NextResponse.json({
            success: true,
            message: 'تم تسجيل إتمام هذه المهمة مسبقاً',
            data: { alreadyCompleted: true }
        });
    }

    // Create completion record
    await StudentTask.create({
        student: student.userId,
        task: taskId,
        status: 'completed',
        completedAt: now,
        pointsEarned: task.points || 0,
    });

    // Award points to student (idempotent because StudentTask has unique index)
    if (task.points > 0) {
        await User.findByIdAndUpdate(student.userId, {
            $inc: { points: task.points },
        });
    }

    // Check achievements after task completion
    await checkAndAwardAchievements(student.userId);

    return NextResponse.json({
        success: true,
        message: `🎉 أحسنت! تم إتمام المهمة وحصلت على ${task.points} نقطة`,
        data: { pointsEarned: task.points, alreadyCompleted: false },
    });
}

export const POST = withStudent(handler);
