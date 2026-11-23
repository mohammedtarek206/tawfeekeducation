import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import { withAdmin } from '@/lib/auth/middleware';

// GET /api/admin/students - list students with advanced analytics filters
async function handler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const grade = searchParams.get('grade') || '';
    const search = searchParams.get('search') || '';
    const noVideo = searchParams.get('no_video') === 'true';
    const hasVideo = searchParams.get('has_video') === 'true';
    const noExam = searchParams.get('no_exam') === 'true';
    const hasExam = searchParams.get('has_exam') === 'true';
    const inactive = searchParams.get('inactive') === 'true';
    const expiringSoon = searchParams.get('expiring_soon') === 'true';
    const subStatus = searchParams.get('subscription_status') || '';
    const sortBy = searchParams.get('sort') || 'created_desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    const now = new Date();
    const filter: Record<string, any> = { role: 'student' };

    if (status) filter.status = status;
    if (grade) filter.grade = grade;

    if (search) {
        filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }];
    }

    // 1. Subscription status filtering
    if (subStatus === 'free') {
        filter.isFreeStudent = true;
    } else if (subStatus === 'active') {
        filter.subscriptionStatus = 'active';
    } else if (subStatus === 'expired') {
        filter.$or = [
            { subscriptionStatus: 'expired' },
            { subscriptionEndDate: { $lt: now } },
        ];
    } else if (subStatus === 'paid') {
        filter.subscriptionStatus = 'active';
        filter.isFreeStudent = false;
    } else if (subStatus === 'none') {
        filter.isFreeStudent = false;
        filter.subscriptionStatus = { $nin: ['active', 'expired'] };
    }

    // 2. Expiring soon filter (subscription ends in <= 3 days and >= now)
    if (expiringSoon) {
        const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        filter.subscriptionEndDate = { $gte: now, $lte: inThreeDays };
        filter.subscriptionStatus = 'active';
    }

    // 3. Inactive filter (no login or activity in >= 7 days)
    if (inactive) {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filter.$and = filter.$and || [];
        filter.$and.push({
            $or: [
                { lastLogin: { $lt: sevenDaysAgo } },
                { lastLogin: { $exists: false } },
                { lastLogin: null },
            ],
        });
    }

    // 4. Video watch filtering (no_video / has_video)
    if (noVideo || hasVideo) {
        const studentIdsWithVideo = await LessonProgress.distinct('student');
        if (noVideo) {
            filter._id = filter._id || {};
            filter._id.$nin = studentIdsWithVideo;
        } else if (hasVideo) {
            filter._id = filter._id || {};
            filter._id.$in = studentIdsWithVideo;
        }
    }

    // 5. Exam taking filtering (no_exam / has_exam)
    if (noExam || hasExam) {
        const studentIdsWithExam = await ExamAttempt.distinct('student');
        if (noExam) {
            if (filter._id && filter._id.$nin) {
                // If both noVideo and noExam are selected, intersect or handle
                filter.$and = filter.$and || [];
                filter.$and.push({ _id: { $nin: studentIdsWithExam } });
            } else {
                filter._id = filter._id || {};
                filter._id.$nin = studentIdsWithExam;
            }
        } else if (hasExam) {
            filter._id = filter._id || {};
            filter._id.$in = studentIdsWithExam;
        }
    }

    // Sorting
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === 'points_desc') {
        sortObj = { points: -1, createdAt: -1 };
    } else if (sortBy === 'points_asc') {
        sortObj = { points: 1 };
    } else if (sortBy === 'last_login') {
        sortObj = { lastLogin: -1 };
    } else if (sortBy === 'name') {
        sortObj = { name: 1 };
    }

    const total = await User.countDocuments(filter);
    const students = await User.find(filter)
        .select('name phone grade governorate status phoneVerified isFreeStudent subscriptionStatus subscriptionEndDate points level referralCode parentName parentPhone createdAt lastLogin')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return NextResponse.json({
        success: true,
        data: {
            students,
            total,
            page,
            pages: Math.ceil(total / limit),
            appliedFilters: {
                status,
                grade,
                search,
                noVideo,
                noExam,
                inactive,
                expiringSoon,
                subStatus,
                sortBy,
            },
        },
    });
}

export const GET = withAdmin(handler);
