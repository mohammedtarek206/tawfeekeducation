import connectDB from '@/lib/db/connect';
import AdminAlert, { AdminAlertCategory, AdminAlertSeverity } from '@/lib/db/models/AdminAlert';
import User from '@/lib/db/models/User';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import PaymentRequest from '@/lib/db/models/PaymentRequest';
import Settings from '@/lib/db/models/Settings';
import mongoose from 'mongoose';

interface AlertInsertItem {
    category: AdminAlertCategory;
    type: string;
    title: string;
    message: string;
    severity: AdminAlertSeverity;
    studentId?: mongoose.Types.ObjectId;
    studentName?: string;
    actionUrl: string;
    dedupKey: string;
    metadata?: Record<string, any>;
}

/**
 * Synchronize and evaluate admin alerts.
 * Runs atomically with dedupKey to prevent duplicate alerts.
 */
export async function syncAdminAlerts(): Promise<number> {
    await connectDB();

    const now = new Date();
    const alertItems: AlertInsertItem[] = [];

    // 1. Fetch Inactivity Threshold from Settings (default: 7 days)
    const inactivitySetting = await Settings.findOne({ key: 'inactivity_alert_days' }).lean() as any;
    const inactivityDays = Number(inactivitySetting?.value) || 7;
    const inactivityThreshold = new Date(now.getTime() - inactivityDays * 24 * 60 * 60 * 1000);

    // Current ISO week string for deduplicating weekly inactivity alerts (e.g. 2026-W47)
    const year = now.getUTCFullYear();
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    const weekKey = `${year}-W${weekNum}`;

    // 2. Alert: Inactive students (approved, lastLogin or createdAt < threshold)
    const inactiveStudents = await User.find({
        role: 'student',
        status: 'approved',
        $or: [
            { lastLogin: { $lt: inactivityThreshold } },
            { lastLogin: { $exists: false }, createdAt: { $lt: inactivityThreshold } },
            { lastLogin: null, createdAt: { $lt: inactivityThreshold } },
        ],
    })
        .select('_id name phone grade lastLogin createdAt')
        .limit(50)
        .lean();

    for (const student of inactiveStudents) {
        const lastActive = student.lastLogin ? new Date(student.lastLogin) : new Date(student.createdAt);
        const daysAway = Math.max(1, Math.round((now.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000)));

        alertItems.push({
            category: 'inactivity',
            type: 'student_inactive',
            title: `طالب منقطع عن المنصة (${daysAway} يوم)`,
            message: `لم يسجل الطالب ${student.name} أي دخول أو نشاط في المنصة منذ ${daysAway} يومًا.`,
            severity: daysAway >= 14 ? 'critical' : 'warning',
            studentId: student._id as mongoose.Types.ObjectId,
            studentName: student.name,
            actionUrl: `/admin/students/${student._id}`,
            dedupKey: `inactivity_${student._id}_${weekKey}`,
            metadata: { daysAway, lastActive },
        });
    }

    // 3. Alert: Students registered > 3 days ago who watched 0 videos
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const recentApprovedStudents = await User.find({
        role: 'student',
        status: 'approved',
        createdAt: { $lt: threeDaysAgo },
    })
        .select('_id name createdAt')
        .limit(100)
        .lean();

    if (recentApprovedStudents.length > 0) {
        const studentIds = recentApprovedStudents.map((s) => s._id);
        const activeWatchers = await LessonProgress.distinct('student', {
            student: { $in: studentIds },
        });
        const activeWatchersSet = new Set(activeWatchers.map((id: any) => id.toString()));

        for (const student of recentApprovedStudents as any[]) {
            if (!activeWatchersSet.has(student._id.toString())) {
                const daysSinceReg = Math.round((now.getTime() - new Date(student.createdAt).getTime()) / (24 * 60 * 60 * 1000));
                alertItems.push({
                    category: 'inactivity',
                    type: 'no_video_after_signup',
                    title: 'طالب لم يشاهد أي حصة تعليمية',
                    message: `سجل الطالب ${student.name} منذ ${daysSinceReg} أيام ولم يبدأ مشاهدة أي حصة حتى الآن.`,
                    severity: 'warning',
                    studentId: student._id as mongoose.Types.ObjectId,
                    studentName: student.name,
                    actionUrl: `/admin/students/${student._id}`,
                    dedupKey: `no_video_${student._id}`,
                    metadata: { daysSinceReg },
                });
            }
        }
    }

    // 4. Alert: Stalled in mid-lesson (started watch, 10% <= progress < 90%, no update in 5 days)
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const stalledProgress = await LessonProgress.find({
        isCompleted: false,
        progressPercentage: { $gte: 10, $lt: 90 },
        updatedAt: { $lt: fiveDaysAgo },
    })
        .populate('student', 'name status')
        .populate('lesson', 'title')
        .limit(25)
        .lean();

    for (const p of stalledProgress as any[]) {
        if (p.student && p.student.status === 'approved' && p.lesson) {
            alertItems.push({
                category: 'inactivity',
                type: 'course_stalled',
                title: 'توقف عن إكمال الحصة',
                message: `بدأ الطالب ${p.student.name} حصة "${p.lesson.title}" وتوقف عند نسبة ${p.progressPercentage}% منذ أكثر من 5 أيام.`,
                severity: 'info',
                studentId: p.student._id,
                studentName: p.student.name,
                actionUrl: `/admin/students/${p.student._id}`,
                dedupKey: `stalled_${p.student._id}_${p.lesson._id}`,
                metadata: { progressPercentage: p.progressPercentage, lessonTitle: p.lesson.title },
            });
        }
    }

    // 5. Alert: Free subscription expiring soon (< 3 days)
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringFreeStudents = await User.find({
        role: 'student',
        isFreeStudent: true,
        subscriptionStatus: 'active',
        subscriptionEndDate: { $gte: now, $lte: inThreeDays },
    })
        .select('_id name subscriptionEndDate')
        .limit(50)
        .lean();

    for (const student of expiringFreeStudents) {
        const endDate = new Date(student.subscriptionEndDate!);
        const remainingHours = Math.max(1, Math.round((endDate.getTime() - now.getTime()) / (60 * 60 * 1000)));
        const remainingDays = Math.ceil(remainingHours / 24);
        const dayKey = endDate.toISOString().slice(0, 10);

        alertItems.push({
            category: 'subscription',
            type: 'sub_expiring_soon',
            title: `اشتراك مجاني قارب على الانتهاء (${remainingDays} يوم)`,
            message: `سينتهي الاشتراك المجاني للطالب ${student.name} خلال ${remainingHours <= 48 ? `${remainingHours} ساعة` : `${remainingDays} أيام`} (تاريخ الانتهاء: ${dayKey}).`,
            severity: 'warning',
            studentId: student._id as mongoose.Types.ObjectId,
            studentName: student.name,
            actionUrl: `/admin/students/${student._id}`,
            dedupKey: `sub_expiring_${student._id}_${dayKey}`,
            metadata: { remainingHours, endDate },
        });
    }

    // 6. Alert: Free subscription already expired in the past 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expiredStudents = await User.find({
        role: 'student',
        isFreeStudent: true,
        subscriptionEndDate: { $gte: sevenDaysAgo, $lt: now },
    })
        .select('_id name subscriptionEndDate')
        .limit(50)
        .lean();

    for (const student of expiredStudents) {
        const endDate = new Date(student.subscriptionEndDate!);
        const dayKey = endDate.toISOString().slice(0, 10);

        alertItems.push({
            category: 'subscription',
            type: 'sub_expired',
            title: 'انتهت صلاحية الاشتراك المجاني',
            message: `انتهى الاشتراك المجاني للطالب ${student.name} بتاريخ ${dayKey} ولم يقم بالترقية أو التجديد.`,
            severity: 'info',
            studentId: student._id as mongoose.Types.ObjectId,
            studentName: student.name,
            actionUrl: `/admin/students/${student._id}`,
            dedupKey: `sub_expired_${student._id}_${dayKey}`,
            metadata: { endDate },
        });
    }

    // 7. Alert: Pending payment requests awaiting approval
    const pendingPayments = await PaymentRequest.find({ status: 'pending' })
        .populate('studentId', 'name')
        .limit(20)
        .lean();

    for (const req of pendingPayments as any[]) {
        const studentName = req.studentId?.name || 'طالب';
        alertItems.push({
            category: 'payment',
            type: 'pending_payment',
            title: 'طلب اشتراك ودفع جديد معلق',
            message: `قدم الطالب ${studentName} طلب دفع بقيمة ${req.amount} ج.م بانتظار مراجعة الإيصال والموافقة.`,
            severity: 'critical',
            studentId: req.studentId?._id,
            studentName,
            actionUrl: '/admin/subscriptions/requests?status=pending',
            dedupKey: `pending_payment_${req._id}`,
            metadata: { amount: req.amount, paymentMethod: req.paymentMethod },
        });
    }

    // 8. Alert: Perfect score in exam (100% in last 7 days)
    const perfectExamAttempts = await ExamAttempt.find({
        percentage: 100,
        passed: true,
        createdAt: { $gte: sevenDaysAgo },
    })
        .populate('student', 'name')
        .populate('examRef', 'title')
        .limit(20)
        .lean();

    for (const attempt of perfectExamAttempts as any[]) {
        if (attempt.student) {
            const examTitle = attempt.examRef?.title || 'الاختبار';
            alertItems.push({
                category: 'achievement',
                type: 'exam_perfect_score',
                title: 'درجة نهائية وتفوق دراسي 🌟',
                message: `حقّق الطالب ${attempt.student.name} الدرجة النهائية 100% في "${examTitle}".`,
                severity: 'success',
                studentId: attempt.student._id,
                studentName: attempt.student.name,
                actionUrl: `/admin/students/${attempt.student._id}`,
                dedupKey: `perfect_score_${attempt._id}`,
                metadata: { examTitle, score: attempt.score, totalPoints: attempt.totalPoints },
            });
        }
    }

    // 9. Alert: High points milestone (500+, 1000+)
    const highPointStudents = await User.find({
        role: 'student',
        points: { $gte: 500 },
    })
        .select('_id name points')
        .limit(30)
        .lean();

    for (const student of highPointStudents) {
        const milestone = student.points >= 1000 ? 1000 : 500;
        alertItems.push({
            category: 'achievement',
            type: 'high_points',
            title: `إنجاز نقاط متميز (${milestone}+ نقطة) 🏆`,
            message: `وصل الطالب ${student.name} إلى ${student.points} نقطة، وتصدر قائمة الطلاب المتفاعلين.`,
            severity: 'success',
            studentId: student._id as mongoose.Types.ObjectId,
            studentName: student.name,
            actionUrl: `/admin/students/${student._id}`,
            dedupKey: `high_points_${student._id}_${milestone}`,
            metadata: { points: student.points, milestone },
        });
    }

    if (alertItems.length === 0) return 0;

    // Atomic bulk upsert with $setOnInsert: existing alerts (even if resolved) are never duplicated or overwritten
    const bulkOps = alertItems.map((item) => ({
        updateOne: {
            filter: { dedupKey: item.dedupKey },
            update: {
                $setOnInsert: {
                    category: item.category,
                    type: item.type,
                    title: item.title,
                    message: item.message,
                    severity: item.severity,
                    studentId: item.studentId,
                    studentName: item.studentName,
                    actionUrl: item.actionUrl,
                    dedupKey: item.dedupKey,
                    isRead: false,
                    isResolved: false,
                    metadata: item.metadata,
                    createdAt: now,
                },
            },
            upsert: true,
        },
    }));

    const result = await AdminAlert.bulkWrite(bulkOps);
    return result.upsertedCount || 0;
}
