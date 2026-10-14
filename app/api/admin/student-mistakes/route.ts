import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Question from '@/lib/db/models/Question';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const grade = searchParams.get('grade')?.trim() || '';
    const subject = searchParams.get('subject')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Fetch all submitted attempts (with student field)
    const attempts = await ExamAttempt.find({ status: 'submitted' })
        .select('answers student submittedAt examType')
        .lean();

    // Build question mistakes map: questionId -> { count, studentIds: Set }
    const questionMistakesMap = new Map<string, { count: number; studentIds: Set<string> }>();

    for (const att of (attempts as any[])) {
        for (const ans of (att.answers || [])) {
            if (!ans.isCorrect && ans.questionId) {
                const qId = ans.questionId.toString();
                const current = questionMistakesMap.get(qId) || { count: 0, studentIds: new Set<string>() };
                current.count += 1;
                if (att.student) current.studentIds.add(att.student.toString());
                questionMistakesMap.set(qId, current);
            }
        }
    }

    if (questionMistakesMap.size === 0) {
        return NextResponse.json({
            success: true,
            data: {
                topMistakenQuestions: [],
                totalMistakesRecorded: 0,
                totalPages: 0,
                currentPage: page,
            },
        });
    }

    // Build question filter
    const questionFilter: Record<string, unknown> = {
        _id: { $in: Array.from(questionMistakesMap.keys()) },
    };
    if (grade) questionFilter.grade = grade;
    if (subject) questionFilter.subject = subject;

    const questions = await Question.find(questionFilter)
        .select('text subject grade difficulty choices')
        .lean();

    // Collect all unique student IDs across filtered questions
    const allStudentIds = new Set<string>();
    for (const q of (questions as any[])) {
        const data = questionMistakesMap.get(q._id.toString());
        if (data) {
            data.studentIds.forEach((id) => allStudentIds.add(id));
        }
    }

    // Fetch student names by their IDs
    const students = await User.find({ _id: { $in: Array.from(allStudentIds) } })
        .select('_id name grade')
        .lean();

    const studentMap = new Map<string, { name: string; grade?: string }>();
    for (const s of (students as any[])) {
        studentMap.set(s._id.toString(), { name: s.name, grade: s.grade });
    }

    // Build result list
    let topMistakenQuestions = (questions as any[])
        .map((q) => {
            const data = questionMistakesMap.get(q._id.toString())!;
            const affectedStudents = Array.from(data.studentIds).map((sid) => {
                const st = studentMap.get(sid);
                return {
                    _id: sid,
                    name: st?.name || null,
                    grade: st?.grade || null,
                };
            });
            return {
                _id: q._id,
                text: q.text,
                subject: q.subject,
                grade: q.grade,
                difficulty: q.difficulty,
                errorCount: data.count,
                affectedStudentsCount: data.studentIds.size,
                affectedStudents,
            };
        })
        .sort((a, b) => b.errorCount - a.errorCount);

    // Filter by student name if search is provided
    if (search) {
        const lowerSearch = search.toLowerCase();
        topMistakenQuestions = topMistakenQuestions.filter((q) =>
            q.affectedStudents.some((s: { name: string | null }) =>
                s.name?.toLowerCase().includes(lowerSearch)
            )
        );
    }

    const totalCount = topMistakenQuestions.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedQuestions = topMistakenQuestions.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
        success: true,
        data: {
            topMistakenQuestions: paginatedQuestions,
            totalMistakesRecorded: Array.from(questionMistakesMap.values()).reduce(
                (acc, curr) => acc + curr.count,
                0
            ),
            totalCount,
            totalPages,
            currentPage: page,
        },
    });
}

export const GET = withAdmin(getHandler);
