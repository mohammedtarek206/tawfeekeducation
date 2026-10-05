import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Task from '@/lib/db/models/Task';
import StudentTask from '@/lib/db/models/StudentTask';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

async function handler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const { default: User } = await import('@/lib/db/models/User');

    const studentUser = (await User.findById(student.userId).select('grade').lean()) as any;
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    const now = new Date();

    // Build filter: tasks for this student based on targetAudience
    const audienceQuery = {
        $or: [
            { targetAudience: 'all' },
            { targetAudience: 'grade', grade: studentUser.grade },
            { targetAudience: 'subject' }, // show all subject-based tasks if student matches grade at least
            { targetAudience: 'specific_students', specificStudents: student.userId },
        ]
    };

    const tasks = await Task.find({
        isPublished: true,
        ...audienceQuery,
    }).sort({ endDate: 1, createdAt: -1 }).lean();

    // Get student's completions
    const completions = await StudentTask.find({ student: student.userId }).lean();
    const completionMap = new Map(completions.map((c: any) => [c.task.toString(), c]));

    // Annotate tasks with status
    const annotatedTasks = tasks.map((task: any) => {
        const completion = completionMap.get(task._id.toString());
        let status: 'new' | 'in_progress' | 'completed' | 'overdue' = 'new';

        if (completion) {
            status = 'completed';
        } else if (task.endDate && new Date(task.endDate) < now) {
            status = 'overdue';
        }

        return {
            ...task,
            status,
            isCompleted: !!completion,
            completedAt: completion?.completedAt || null,
            pointsEarned: completion?.pointsEarned || 0,
        };
    });

    const summary = {
        total: annotatedTasks.length,
        new: annotatedTasks.filter(t => t.status === 'new').length,
        completed: annotatedTasks.filter(t => t.status === 'completed').length,
        overdue: annotatedTasks.filter(t => t.status === 'overdue').length,
    };

    return NextResponse.json({ success: true, data: { tasks: annotatedTasks, summary } });
}

export const GET = withStudent(handler);
