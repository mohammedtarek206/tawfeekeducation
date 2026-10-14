import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';

async function getHandler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get('grade')?.trim() || '';
    const topN = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)));

    // Build student filter: only students with approved status
    const studentFilter: Record<string, unknown> = { role: 'student', status: 'approved' };
    if (grade) studentFilter.grade = grade;

    const students = await User.find(studentFilter)
        .select('_id name grade')
        .lean();

    if (!students.length) {
        return NextResponse.json({
            success: true,
            data: {
                leaderboard: [],
                stats: {
                    totalRankedStudents: 0,
                    topStudentName: null,
                    highestAvgPercentage: null,
                    lastUpdated: new Date().toISOString(),
                },
            },
        });
    }

    const studentIds = students.map((s: any) => s._id);

    // Fetch all submitted attempts for these students
    const attempts = await ExamAttempt.find({
        student: { $in: studentIds },
        status: 'submitted',
    })
        .select('student score totalPoints percentage examType submittedAt')
        .lean();

    // Map studentId -> attempts
    const attemptsMap = new Map<string, {
        totalScore: number;
        totalPoints: number;
        count: number;
        percentageSum: number;
        lastSubmittedAt: Date | null;
    }>();

    for (const att of (attempts as any[])) {
        const sid = att.student?.toString();
        if (!sid) continue;

        const existing = attemptsMap.get(sid) || {
            totalScore: 0,
            totalPoints: 0,
            count: 0,
            percentageSum: 0,
            lastSubmittedAt: null,
        };

        existing.totalScore += att.score ?? 0;
        existing.totalPoints += att.totalPoints ?? 0;
        existing.count += 1;
        existing.percentageSum += att.percentage ?? 0;

        const submittedDate = att.submittedAt ? new Date(att.submittedAt) : null;
        if (submittedDate && (!existing.lastSubmittedAt || submittedDate > existing.lastSubmittedAt)) {
            existing.lastSubmittedAt = submittedDate;
        }

        attemptsMap.set(sid, existing);
    }

    // Build ranked list: only students with at least 1 exam attempt
    const studentMap = new Map<string, any>();
    for (const s of (students as any[])) {
        studentMap.set(s._id.toString(), s);
    }

    interface RankedStudent {
        studentId: string;
        name: string;
        grade: string;
        examCount: number;
        totalScore: number;
        totalPoints: number;
        avgPercentage: number;
        lastSubmittedAt: Date | null;
    }

    const ranked: RankedStudent[] = [];

    for (const [sid, stats] of Array.from(attemptsMap.entries())) {
        if (stats.count === 0) continue;
        const student = studentMap.get(sid);
        if (!student) continue;

        // Use average percentage as the main ranking criterion (fair across different exams)
        const avgPercentage = stats.count > 0 ? stats.percentageSum / stats.count : 0;

        ranked.push({
            studentId: sid,
            name: student.name,
            grade: student.grade || '',
            examCount: stats.count,
            totalScore: stats.totalScore,
            totalPoints: stats.totalPoints,
            avgPercentage: Math.round(avgPercentage * 100) / 100,
            lastSubmittedAt: stats.lastSubmittedAt,
        });
    }

    // Sort by avgPercentage desc, then totalScore desc (tie-break), then examCount desc
    ranked.sort((a, b) => {
        if (b.avgPercentage !== a.avgPercentage) return b.avgPercentage - a.avgPercentage;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.examCount - a.examCount;
    });

    const topStudents = ranked.slice(0, topN);

    // Assign ranks with tie handling
    const leaderboard = topStudents.map((student, index) => {
        let rank = index + 1;
        if (index > 0) {
            const prev = topStudents[index - 1];
            if (
                prev.avgPercentage === student.avgPercentage &&
                prev.totalScore === student.totalScore &&
                prev.examCount === student.examCount
            ) {
                // Same rank as previous
                rank = leaderboard[index - 1].rank;
            }
        }
        return {
            rank,
            studentId: student.studentId,
            name: student.name,
            grade: student.grade,
            examCount: student.examCount,
            totalScore: student.totalScore,
            totalPoints: student.totalPoints,
            avgPercentage: student.avgPercentage,
            lastSubmittedAt: student.lastSubmittedAt,
        };
    });

    const top = ranked[0] || null;
    const lastUpdated = attempts.length > 0
        ? new Date(Math.max(...(attempts as any[]).filter(a => a.submittedAt).map(a => new Date(a.submittedAt).getTime()))).toISOString()
        : new Date().toISOString();

    return NextResponse.json({
        success: true,
        data: {
            leaderboard,
            stats: {
                totalRankedStudents: ranked.length,
                topStudentName: top?.name || null,
                highestAvgPercentage: top ? top.avgPercentage : null,
                lastUpdated,
            },
        },
    });
}

export const GET = withAdmin(getHandler);
