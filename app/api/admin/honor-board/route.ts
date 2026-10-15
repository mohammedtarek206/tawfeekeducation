import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// Must match withAdmin signature: (req, context, user) => Promise<NextResponse>
async function getHandler(
    req: NextRequest,
    _context: unknown,
    _admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const grade = searchParams.get('grade')?.trim() || '';
        const limitParam = parseInt(searchParams.get('limit') || '10', 10);
        const topN = Math.min(50, Math.max(5, isNaN(limitParam) ? 10 : limitParam));

        // 1. Find approved students
        const studentFilter: Record<string, unknown> = { role: 'student', status: 'approved' };
        if (grade) studentFilter.grade = grade;

        const students = await User.find(studentFilter)
            .select('_id name grade')
            .lean() as unknown as Array<{ _id: { toString(): string }; name: string; grade?: string }>;

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

        const studentIds = students.map((s) => s._id);

        // 2. Fetch submitted attempts only
        const attempts = await ExamAttempt.find({
            student: { $in: studentIds },
            status: 'submitted',
        })
            .select('student score totalPoints percentage submittedAt')
            .lean() as Array<{
                student?: { toString(): string };
                score?: number;
                totalPoints?: number;
                percentage?: number;
                submittedAt?: Date | string;
            }>;

        // 3. Aggregate per student
        const aggMap = new Map<string, {
            totalScore: number;
            totalPoints: number;
            count: number;
            percentageSum: number;
            lastSubmittedAt: Date | null;
        }>();

        for (const att of attempts) {
            const sid = att.student?.toString();
            if (!sid) continue;

            const existing = aggMap.get(sid) ?? {
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
            if (
                submittedDate &&
                !isNaN(submittedDate.getTime()) &&
                (!existing.lastSubmittedAt || submittedDate > existing.lastSubmittedAt)
            ) {
                existing.lastSubmittedAt = submittedDate;
            }

            aggMap.set(sid, existing);
        }

        // 4. Build student lookup
        const studentMap = new Map<string, { name: string; grade?: string }>();
        for (const s of students) {
            studentMap.set(s._id.toString(), { name: s.name, grade: s.grade });
        }

        // 5. Build ranked array — students with at least 1 attempt
        const ranked: Array<{
            studentId: string;
            name: string;
            grade: string;
            examCount: number;
            totalScore: number;
            totalPoints: number;
            avgPercentage: number;
            lastSubmittedAt: Date | null;
        }> = [];

        for (const [sid, stats] of Array.from(aggMap.entries())) {
            if (stats.count === 0) continue;
            const student = studentMap.get(sid);
            if (!student) continue;

            const avgPercentage = stats.percentageSum / stats.count;

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

        // 6. Sort: avg% desc → totalScore desc → examCount desc
        ranked.sort((a, b) => {
            if (b.avgPercentage !== a.avgPercentage) return b.avgPercentage - a.avgPercentage;
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            return b.examCount - a.examCount;
        });

        const topStudents = ranked.slice(0, topN);

        // 7. Assign ranks with tie detection
        const leaderboard: Array<{
            rank: number;
            studentId: string;
            name: string;
            grade: string;
            examCount: number;
            totalScore: number;
            totalPoints: number;
            avgPercentage: number;
            lastSubmittedAt: string | null;
        }> = [];

        for (let i = 0; i < topStudents.length; i++) {
            const student = topStudents[i];
            let rank = i + 1;

            if (i > 0) {
                const prev = topStudents[i - 1];
                if (
                    prev.avgPercentage === student.avgPercentage &&
                    prev.totalScore === student.totalScore &&
                    prev.examCount === student.examCount
                ) {
                    rank = leaderboard[i - 1].rank;
                }
            }

            leaderboard.push({
                rank,
                studentId: student.studentId,
                name: student.name,
                grade: student.grade,
                examCount: student.examCount,
                totalScore: student.totalScore,
                totalPoints: student.totalPoints,
                avgPercentage: student.avgPercentage,
                lastSubmittedAt: student.lastSubmittedAt
                    ? student.lastSubmittedAt.toISOString()
                    : null,
            });
        }

        const top = ranked[0] ?? null;

        // 8. Safe lastUpdated — loop instead of spread to avoid stack overflow on large arrays
        let lastUpdated = new Date().toISOString();
        let maxTime = 0;
        for (const att of attempts) {
            if (att.submittedAt) {
                const t = new Date(att.submittedAt).getTime();
                if (!isNaN(t) && t > maxTime) maxTime = t;
            }
        }
        if (maxTime > 0) lastUpdated = new Date(maxTime).toISOString();

        return NextResponse.json({
            success: true,
            data: {
                leaderboard,
                stats: {
                    totalRankedStudents: ranked.length,
                    topStudentName: top?.name ?? null,
                    highestAvgPercentage: top ? top.avgPercentage : null,
                    lastUpdated,
                },
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board] error:', message);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ في الخادم', detail: message },
            { status: 500 }
        );
    }
}

export const GET = withAdmin(getHandler);
