import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Lesson from '@/lib/db/models/Lesson';
import LessonProgress from '@/lib/db/models/LessonProgress';
import Exam from '@/lib/db/models/Exam';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import Subscription from '@/lib/db/models/Subscription';
import PointTransaction from '@/lib/db/models/PointTransaction';
import StudentAchievement from '@/lib/db/models/StudentAchievement';
import StudentTask from '@/lib/db/models/StudentTask';
import AuditLog from '@/lib/db/models/AuditLog';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getStudentPointsBreakdown } from '@/lib/gamification/engine';
import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';
import mongoose from 'mongoose';

export const revalidate = 0;

// GET /api/admin/students/[id]/tracking
async function getHandler(
    _req: NextRequest,
    context: { params?: Record<string, string> },
    _admin: JWTPayload
): Promise<NextResponse> {
    await connectDB();

    const studentId = context.params?.id;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // 1. Fetch Student User
    const student = await User.findById(studentObjectId).select('-password').lean() as any;
    if (!student || student.role !== 'student') {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    const now = new Date();

    // Check Access & Real Subscription Status
    const accessCheck = await checkStudentAccess(studentId, { grade: student.grade });

    const studentGrade = student.grade || '';
    const gradeFilter = (studentGrade === 'second_secondary' || studentGrade === 'second_secondary_baccalaureate')
        ? { $in: ['second_secondary', 'second_secondary_baccalaureate'] }
        : studentGrade;

    // 2. Fetch Lessons & Watch Progress
    const [allLessons, allProgress] = await Promise.all([
        Lesson.find(studentGrade ? { isPublished: true, grade: gradeFilter } : { isPublished: true })
            .select('title lessonNumber unit subject duration points completionThreshold isFree youtubeId order')
            .sort({ unit: 1, order: 1, lessonNumber: 1 })
            .lean() as Promise<any[]>,
        LessonProgress.find({ student: studentObjectId }).lean() as Promise<any[]>,
    ]);

    const progressMap = new Map<string, any>();
    for (const p of allProgress) {
        progressMap.set(p.lesson.toString(), p);
    }

    let watchedVideosCount = 0;
    let completedVideosCount = 0;
    let inProgressVideosCount = 0;
    let notStartedVideosCount = 0;

    const videoTrackingTable = allLessons.map((lesson) => {
        const prog = progressMap.get(lesson._id.toString());
        const watchedPct = prog?.watchedPercentage || 0;
        const isCompleted = Boolean(prog?.isCompleted);
        const uniqueSeconds = prog?.uniqueSecondsWatched || 0;
        const totalWatchTime = prog?.totalWatchTime || 0;
        const lastPosition = prog?.lastWatchedPosition || 0;
        const completedAt = prog?.completedAt || null;
        const lastWatchedAt = prog?.updatedAt || null;
        const pointsAwarded = Boolean(prog?.pointsAwarded);

        let watchStatus: 'not_started' | 'watching' | 'completed' = 'not_started';
        if (isCompleted) {
            watchStatus = 'completed';
            completedVideosCount++;
            watchedVideosCount++;
        } else if (watchedPct > 0 || uniqueSeconds > 0) {
            watchStatus = 'watching';
            inProgressVideosCount++;
            watchedVideosCount++;
        } else {
            watchStatus = 'not_started';
            notStartedVideosCount++;
        }

        return {
            lessonId: lesson._id.toString(),
            title: lesson.title,
            unit: lesson.unit,
            subject: lesson.subject,
            lessonNumber: lesson.lessonNumber,
            duration: lesson.duration || 0,
            watchStatus,
            watchedPercentage: watchedPct,
            uniqueSecondsWatched: uniqueSeconds,
            totalWatchTime,
            lastWatchedPosition: lastPosition,
            isCompleted,
            completedAt,
            lastWatchedAt,
            pointsAwarded,
            isFree: Boolean(lesson.isFree),
        };
    });

    // 3. Fetch Exams & Attempts
    const [allExams, allAttempts] = await Promise.all([
        Exam.find(studentGrade ? { isPublished: true, grade: gradeFilter } : { isPublished: true })
            .select('title type grade duration passingScore totalQuestions points startDate endDate maxAttempts isFree')
            .sort({ createdAt: -1 })
            .lean() as Promise<any[]>,
        ExamAttempt.find({ student: studentObjectId })
            .populate('examRef', 'title type passingScore duration points')
            .sort({ createdAt: -1 })
            .lean() as Promise<any[]>,
    ]);

    const attemptsByExam = new Map<string, any[]>();
    for (const a of allAttempts) {
        const refId = a.examRef?._id?.toString() || a.examRef?.toString();
        if (refId) {
            const list = attemptsByExam.get(refId) || [];
            list.push(a);
            attemptsByExam.set(refId, list);
        }
    }

    let startedExamsCount = 0;
    let completedExamsCount = 0;
    let totalScoreSum = 0;
    let totalPercentageSum = 0;
    let totalEvaluatedAttempts = 0;
    let highestScorePercentage = 0;
    let latestAttemptDate: Date | null = null;

    const examTrackingTable = allExams.map((exam) => {
        const attempts = attemptsByExam.get(exam._id.toString()) || [];
        const hasAttempts = attempts.length > 0;
        const latestAttempt = attempts[0] || null;

        let bestAttempt = null;
        if (hasAttempts) {
            bestAttempt = attempts.reduce((best, curr) => (curr.percentage > (best?.percentage || 0) ? curr : best), attempts[0]);
        }

        let examStatus: 'not_started' | 'started' | 'submitted' | 'graded' | 'needs_manual_grading' = 'not_started';

        if (latestAttempt) {
            startedExamsCount++;
            if (latestAttempt.status === 'submitted') {
                completedExamsCount++;
                if (latestAttempt.hasUngradedEssays) {
                    examStatus = 'needs_manual_grading';
                } else {
                    examStatus = 'graded';
                }
            } else if (latestAttempt.status === 'in_progress') {
                examStatus = 'started';
            } else {
                examStatus = 'submitted';
            }

            if (latestAttempt.percentage !== undefined) {
                totalPercentageSum += latestAttempt.percentage;
                totalScoreSum += latestAttempt.score || 0;
                totalEvaluatedAttempts++;
            }

            if (bestAttempt && bestAttempt.percentage > highestScorePercentage) {
                highestScorePercentage = bestAttempt.percentage;
            }

            if (!latestAttemptDate || new Date(latestAttempt.createdAt) > new Date(latestAttemptDate)) {
                latestAttemptDate = latestAttempt.createdAt;
            }
        }

        return {
            examId: exam._id.toString(),
            title: exam.title,
            type: exam.type,
            passingScore: exam.passingScore,
            duration: exam.duration,
            attemptsCount: attempts.length,
            maxAttempts: exam.maxAttempts,
            status: examStatus,
            score: latestAttempt ? latestAttempt.score : null,
            totalPoints: latestAttempt ? latestAttempt.totalPoints : exam.points,
            percentage: latestAttempt ? latestAttempt.percentage : null,
            passed: latestAttempt ? latestAttempt.passed : null,
            hasUngradedEssays: latestAttempt ? latestAttempt.hasUngradedEssays : false,
            bestPercentage: bestAttempt ? bestAttempt.percentage : null,
            lastAttemptDate: latestAttempt ? latestAttempt.createdAt : null,
        };
    });

    const averageScorePercentage = totalEvaluatedAttempts > 0 ? Math.round(totalPercentageSum / totalEvaluatedAttempts) : 0;
    const notTakenExamsCount = Math.max(0, allExams.length - startedExamsCount);

    // 4. Courses / Units Progress Summary
    const unitsMap = new Map<string, { totalLessons: number; completedLessons: number; lastActivity: Date | null }>();
    for (const v of videoTrackingTable) {
        const unitName = v.unit || 'عام';
        const entry = unitsMap.get(unitName) || { totalLessons: 0, completedLessons: 0, lastActivity: null };
        entry.totalLessons++;
        if (v.isCompleted) entry.completedLessons++;
        if (v.lastWatchedAt) {
            const watchDate = new Date(v.lastWatchedAt);
            if (!entry.lastActivity || watchDate > entry.lastActivity) {
                entry.lastActivity = watchDate;
            }
        }
        unitsMap.set(unitName, entry);
    }

    const coursesTracking = Array.from(unitsMap.entries()).map(([unitName, uData]) => ({
        unit: unitName,
        totalLessons: uData.totalLessons,
        completedLessons: uData.completedLessons,
        remainingLessons: uData.totalLessons - uData.completedLessons,
        progressPercentage: uData.totalLessons > 0 ? Math.round((uData.completedLessons / uData.totalLessons) * 100) : 0,
        isCompleted: uData.totalLessons > 0 && uData.completedLessons === uData.totalLessons,
        lastActivityDate: uData.lastActivity,
    }));

    // 5. Points & Achievements breakdown
    const pointsBreakdown = await getStudentPointsBreakdown(studentObjectId);

    // Fetch earned achievements
    const studentAchievements = await StudentAchievement.find({ student: studentObjectId })
        .populate('achievement', 'title description icon category pointsReward requiredCount')
        .sort({ earnedAt: -1, createdAt: -1 })
        .lean();

    // Fetch tasks
    const studentTasks = await StudentTask.find({ student: studentObjectId })
        .populate('task', 'title description points endDate targetType')
        .sort({ completedAt: -1, createdAt: -1 })
        .lean();

    // 6. Subscriptions History
    const subscriptions = await Subscription.find({ studentId: studentObjectId })
        .populate('planId', 'name type price durationInDays')
        .sort({ createdAt: -1 })
        .lean();

    // 7. General Activity Timeline
    const timelineEvents: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: Date;
        icon: string;
        badgeColor: string;
    }> = [];

    // Login event
    if (student.lastLogin) {
        timelineEvents.push({
            id: `login_${student.lastLogin.getTime()}`,
            type: 'login',
            title: 'تسجيل الدخول',
            description: 'قام الطالب بتسجيل الدخول إلى المنصة',
            timestamp: new Date(student.lastLogin),
            icon: '🔑',
            badgeColor: 'bg-blue-100 text-blue-800',
        });
    }

    // Account creation event
    if (student.createdAt) {
        timelineEvents.push({
            id: `register_${new Date(student.createdAt).getTime()}`,
            type: 'account_created',
            title: 'إنشاء الحساب',
            description: `تم تسجيل حساب الطالب في صف: ${student.grade || 'غير محدد'}`,
            timestamp: new Date(student.createdAt),
            icon: '🎉',
            badgeColor: 'bg-emerald-100 text-emerald-800',
        });
    }

    // Video progress events
    for (const prog of allProgress) {
        const lesson = allLessons.find((l) => l._id.toString() === prog.lesson?.toString());
        const lessonTitle = lesson?.title || 'حصة تعليمية';

        if (prog.isCompleted && prog.completedAt) {
            timelineEvents.push({
                id: `video_comp_${prog._id}`,
                type: 'video_completed',
                title: 'إتمام مشاهدة فيديو',
                description: `أتم الطالب مشاهدة حصة: ${lessonTitle} بنسبة ${prog.watchedPercentage}%`,
                timestamp: new Date(prog.completedAt),
                icon: '🎬',
                badgeColor: 'bg-emerald-100 text-emerald-800',
            });
        } else if (prog.watchedPercentage > 0 && prog.updatedAt) {
            timelineEvents.push({
                id: `video_prog_${prog._id}`,
                type: 'video_progress',
                title: 'مشاهدة فيديو',
                description: `تقدم في مشاهدة حصة: ${lessonTitle} (${prog.watchedPercentage}%)`,
                timestamp: new Date(prog.updatedAt),
                icon: '▶️',
                badgeColor: 'bg-amber-100 text-amber-800',
            });
        }
    }

    // Exam attempts events
    for (const attempt of allAttempts) {
        const examTitle = attempt.examRef?.title || 'امتحان / كويز';
        timelineEvents.push({
            id: `exam_${attempt._id}`,
            type: 'exam_submitted',
            title: `تسليم اختبار: ${examTitle}`,
            description: `النتيجة: ${attempt.score}/${attempt.totalPoints} (${attempt.percentage}%) - ${attempt.passed ? 'ناجح ✔' : 'لم يجتز ❌'}`,
            timestamp: new Date(attempt.submittedAt || attempt.createdAt),
            icon: '📝',
            badgeColor: attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
        });
    }

    // Point transactions events
    for (const tx of pointsBreakdown.recentTransactions) {
        timelineEvents.push({
            id: `point_${tx.id}`,
            type: 'point_transaction',
            title: tx.amount > 0 ? `اكتساب نقاط (+${tx.amount})` : `خصم نقاط (${tx.amount})`,
            description: `${tx.reason} (الرصيد بعد المعاملة: ${tx.balanceAfter})`,
            timestamp: new Date(tx.createdAt),
            icon: '⭐',
            badgeColor: tx.amount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800',
        });
    }

    // Subscriptions events
    for (const sub of subscriptions) {
        timelineEvents.push({
            id: `sub_${sub._id}`,
            type: 'subscription',
            title: sub.source === 'free_offer' ? 'تفعيل اشتراك مجاني' : 'اشتراك مدفوع',
            description: `الحالة: ${sub.status} - من ${new Date(sub.startDate).toLocaleDateString('ar-EG')} إلى ${new Date(sub.endDate).toLocaleDateString('ar-EG')}`,
            timestamp: new Date(sub.createdAt),
            icon: '🎁',
            badgeColor: 'bg-purple-100 text-purple-800',
        });
    }

    // Sort timeline newest first
    timelineEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Compute live subscription state
    let liveSubStatus: 'active' | 'expired' | 'upcoming' | 'paused' | 'none' = 'none';
    if (student.subscriptionStatus === 'suspended' || student.subscriptionStatus === 'cancelled') {
        liveSubStatus = 'paused';
    } else if (student.subscriptionStartDate && new Date(student.subscriptionStartDate) > now) {
        liveSubStatus = 'upcoming';
    } else if (student.subscriptionEndDate && new Date(student.subscriptionEndDate) < now) {
        liveSubStatus = 'expired';
    } else if (accessCheck.canAccess) {
        liveSubStatus = 'active';
    } else if (student.subscriptionStatus === 'active') {
        liveSubStatus = 'active';
    } else {
        liveSubStatus = student.subscriptionStatus || 'none';
    }

    return NextResponse.json({
        success: true,
        data: {
            student: {
                _id: student._id.toString(),
                name: student.name,
                phone: student.phone,
                role: student.role,
                status: student.status,
                grade: student.grade,
                governorate: student.governorate,
                parentName: student.parentName,
                parentPhone: student.parentPhone,
                parentLinkingCode: student.parentLinkingCode,
                points: student.points || 0,
                level: student.level || 1,
                streak: student.streak || 0,
                isFreeStudent: Boolean(student.isFreeStudent),
                freeSlotNumber: student.freeSlotNumber,
                subscriptionStatus: student.subscriptionStatus,
                liveSubStatus,
                subscriptionStartDate: student.subscriptionStartDate,
                subscriptionEndDate: student.subscriptionEndDate,
                lastLogin: student.lastLogin,
                lastActivityDate: student.lastActivityDate || latestAttemptDate,
                createdAt: student.createdAt,
                canAccessContent: accessCheck.canAccess,
                accessReason: accessCheck.reason,
            },
            summary: {
                totalLessonsCount: allLessons.length,
                completedVideosCount,
                inProgressVideosCount,
                notStartedVideosCount,
                videoCompletionRate: allLessons.length > 0 ? Math.round((completedVideosCount / allLessons.length) * 100) : 0,

                totalExamsCount: allExams.length,
                startedExamsCount,
                completedExamsCount,
                notTakenExamsCount,
                averageScorePercentage,
                highestScorePercentage,
                latestAttemptDate,

                totalPoints: student.points || 0,
                enrolledCoursesCount: unitsMap.size,
            },
            videos: videoTrackingTable,
            exams: examTrackingTable,
            courses: coursesTracking,
            points: {
                breakdown: pointsBreakdown,
                achievements: studentAchievements.map((sa: any) => ({
                    id: sa._id.toString(),
                    title: sa.achievement?.title,
                    description: sa.achievement?.description,
                    icon: sa.achievement?.icon,
                    category: sa.achievement?.category,
                    pointsEarned: sa.pointsEarned,
                    earnedAt: sa.earnedAt || sa.createdAt,
                })),
                tasks: studentTasks.map((st: any) => ({
                    id: st._id.toString(),
                    title: st.task?.title,
                    description: st.task?.description,
                    pointsEarned: st.pointsEarned,
                    status: st.status,
                    completedAt: st.completedAt,
                })),
                transactions: pointsBreakdown.recentTransactions,
            },
            subscriptions: {
                current: {
                    status: liveSubStatus,
                    startDate: student.subscriptionStartDate,
                    endDate: student.subscriptionEndDate,
                    isFree: student.isFreeStudent,
                },
                history: subscriptions.map((s: any) => ({
                    id: s._id.toString(),
                    planName: s.planId?.name || (s.source === 'free_offer' ? 'عرض مجاني' : 'اشتراك مخصص'),
                    source: s.source,
                    status: s.status,
                    startDate: s.startDate,
                    endDate: s.endDate,
                    notes: s.notes,
                    createdAt: s.createdAt,
                })),
            },
            timeline: timelineEvents.slice(0, 50),
        },
    });
}

export const GET = withAdmin(getHandler);
