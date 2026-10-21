import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Exam from '@/lib/db/models/Exam';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

// GET /api/admin/exams/results - get paginated exam attempts with real stats and filters
async function getHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const examId = searchParams.get('examId') || '';
    const grade = searchParams.get('grade') || '';
    const examType = searchParams.get('examType') || ''; // 'quiz' | 'weekly_exam' | 'monthly_exam' | 'practice' | 'all'
    const gradingStatus = searchParams.get('gradingStatus') || ''; // 'graded' | 'pending' | 'all'
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const filter: Record<string, any> = {
        status: 'submitted',
    };

    // By default, exclude practice attempts unless explicitly requested
    if (!examType || examType === 'exams_only') {
        filter.examType = { $in: ['quiz', 'weekly_exam', 'monthly_exam'] };
    } else if (examType !== 'all') {
        filter.examType = examType;
    }

    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
        filter.examRef = new mongoose.Types.ObjectId(examId);
    }

    if (gradingStatus === 'pending') {
        filter.hasUngradedEssays = true;
    } else if (gradingStatus === 'graded') {
        filter.hasUngradedEssays = false;
    }

    if (startDate || endDate) {
        filter.submittedAt = {};
        if (startDate) filter.submittedAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.submittedAt.$lte = end;
        }
    }

    // Filter by student search or grade
    if (search.trim() || grade) {
        const userFilter: Record<string, any> = { role: 'student' };
        if (grade) userFilter.grade = grade;
        if (search.trim()) {
            const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            userFilter.$or = [
                { name: { $regex: s, $options: 'i' } },
                { phone: { $regex: s, $options: 'i' } },
            ];
        }
        const matchedStudents = await User.find(userFilter).select('_id').lean();
        const studentIds = matchedStudents.map((s) => s._id);
        filter.student = { $in: studentIds };
    }

    // Calculate real stats
    const totalAttempts = await ExamAttempt.countDocuments(filter);
    const uniqueStudentsArray = await ExamAttempt.distinct('student', filter);
    const uniqueStudentsCount = uniqueStudentsArray.length;

    const pendingEssaysCount = await ExamAttempt.countDocuments({
        ...filter,
        hasUngradedEssays: true,
    });

    const completedAttemptsCount = await ExamAttempt.countDocuments({
        ...filter,
        hasUngradedEssays: false,
    });

    // Aggregation for score averages
    const scoreStats = await ExamAttempt.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                avgScore: { $avg: '$score' },
                avgPercentage: { $avg: '$percentage' },
                maxScore: { $max: '$score' },
                minScore: { $min: '$score' },
                maxPercentage: { $max: '$percentage' },
                minPercentage: { $min: '$percentage' },
            },
        },
    ]);

    const statSummary = scoreStats[0] || {
        avgScore: 0,
        avgPercentage: 0,
        maxScore: 0,
        minScore: 0,
        maxPercentage: 0,
        minPercentage: 0,
    };

    // Fetch paginated attempts
    const attempts = await ExamAttempt.find(filter)
        .populate('student', 'name phone grade')
        .populate('examRef', 'title type subject passingScore totalPoints duration')
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return NextResponse.json({
        success: true,
        data: {
            attempts,
            total: totalAttempts,
            page,
            pages: Math.ceil(totalAttempts / limit) || 1,
            stats: {
                totalAttempts,
                uniqueStudents: uniqueStudentsCount,
                completedAttempts: completedAttemptsCount,
                pendingEssays: pendingEssaysCount,
                avgPercentage: Math.round(statSummary.avgPercentage || 0),
                avgScore: Math.round((statSummary.avgScore || 0) * 10) / 10,
                maxScore: statSummary.maxScore || 0,
                minScore: statSummary.minScore || 0,
                maxPercentage: statSummary.maxPercentage || 0,
                minPercentage: statSummary.minPercentage || 0,
            },
        },
    });
}

export const GET = withAdmin(getHandler);
