import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Exam from '@/lib/db/models/Exam';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/student/exams?type=weekly|monthly
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const studentUser = await User.findById(student.userId).select('grade');
    if (!studentUser) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');     // 'quiz' | 'weekly' | 'monthly'
    const lessonId = searchParams.get('lessonId'); // للتصفية بالحصة

    const filter: Record<string, unknown> = {
        isPublished: true,
        subject: { $ne: 'geography' }, // الجغرافيا مؤرشفة — لا تُرجع للطلاب
    };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        filter.grade = studentUser.grade;
    }
    if (type) filter.type = type;
    if (lessonId) filter.lessonId = lessonId;

    const exams = await Exam.find(filter)
        .select('title type duration passingScore totalPoints startDate endDate questions subject createdAt')
        .sort({ createdAt: -1 })
        .lean();

    // Get attempt info for each exam
    const examIds = exams.map((e) => e._id);
    const attempts = await ExamAttempt.find({
        student: student.userId,
        examRef: { $in: examIds },
        status: 'submitted',
    }).select('examRef score percentage passed').lean();

    const attemptMap: Record<string, typeof attempts[0]> = {};
    attempts.forEach((a) => { attemptMap[a.examRef.toString()] = a; });

    const examsWithAttempts = exams.map((exam) => ({
        ...exam,
        questionCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
        attempt: attemptMap[exam._id.toString()] || null,
    }));

    return NextResponse.json({ success: true, data: { exams: examsWithAttempts } });
}

export const GET = withStudent(getHandler);
