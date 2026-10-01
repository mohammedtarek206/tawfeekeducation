import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { examSchema } from '@/lib/validation/schemas';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import Notification from '@/lib/db/models/Notification';
import User from '@/lib/db/models/User';

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '';
    const grade = searchParams.get('grade') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (grade) filter.grade = grade;

    const total = await Exam.countDocuments(filter);
    const exams = await Exam.find(filter)
        .populate('questions', 'text type difficulty points')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return NextResponse.json({
        success: true,
        data: { exams, total, page, pages: Math.ceil(total / limit) },
    });
}

async function postHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();

    const parsed = examSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.errors[0].message },
            { status: 400 }
        );
    }

    // Validate question IDs
    const questionIds = body.questionIds || [];

    // Calculate total points (0 if no questions added yet)
    let totalPoints = 0;
    if (questionIds.length > 0) {
        const questions = await Question.find({ _id: { $in: questionIds } }).select('points');
        totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }

    const exam = await Exam.create({
        ...parsed.data,
        questions: questionIds,
        totalPoints,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        createdBy: admin.userId,
    });

    if (questionIds.length > 0) {
        await Question.updateMany({ _id: { $in: questionIds } }, { $inc: { usageCount: 1 } });
    }

    // If published, notify students
    if (parsed.data.isPublished) {
        const students = await User.find({
            role: 'student',
            status: 'approved',
            grade: parsed.data.grade,
        }).select('_id');

        const notifications = students.map((s) => ({
            user: s._id,
            type: 'new_exam',
            title: `امتحان جديد: ${parsed.data.title}`,
            message: `تم إضافة ${parsed.data.type === 'weekly' ? 'امتحان أسبوعي' : parsed.data.type === 'monthly' ? 'امتحان شهري' : 'كويز حصة'} جديد`,
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    }

    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: AUDIT_ACTIONS.EXAM_CREATED,
        target: exam._id.toString(),
        targetModel: 'Exam',
        metadata: { title: exam.title, type: exam.type },
    });

    return NextResponse.json(
        { success: true, message: 'تم إنشاء الامتحان بنجاح', data: { exam } },
        { status: 201 }
    );
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
