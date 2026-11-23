import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import PointTransaction, { TransactionType } from '@/lib/db/models/PointTransaction';
import Level from '@/lib/db/models/Level';
import Notification from '@/lib/db/models/Notification';
import mongoose from 'mongoose';

export interface AwardPointsOptions {
    studentId: string | mongoose.Types.ObjectId;
    amount: number;
    type: TransactionType;
    reason: string;
    referenceId?: string | mongoose.Types.ObjectId;
    referenceType?: string;
    awardedBy?: string | mongoose.Types.ObjectId;
    idempotencyKey?: string;
    allowNonApproved?: boolean;
}

export interface AwardPointsResult {
    success: boolean;
    newBalance: number;
    levelUp?: boolean;
    newLevel?: number;
    alreadyAwarded?: boolean;
    error?: string;
}

export interface GamificationSettings {
    lessonWatchPoints: number;
    lessonCompletePoints: number;
    quizCompletePoints: number;
    weeklyExamPoints: number;
    monthlyExamPoints: number;
    streakBonus: number;
    referralPoints: number;
    videoCompletionThreshold: number;
}

export async function getGamificationSettings(): Promise<GamificationSettings> {
    await connectDB();
    const Settings = (await import('@/lib/db/models/Settings')).default;
    const settingsList = await Settings.find({
        key: {
            $in: [
                'lesson_watch_points',
                'lesson_complete_points',
                'quiz_complete_points',
                'weekly_exam_points',
                'monthly_exam_points',
                'streak_bonus',
                'referral_points',
                'video_completion_threshold',
            ],
        },
    }).lean();

    const map: Record<string, any> = {};
    settingsList.forEach((s: any) => {
        map[s.key] = s.value;
    });

    return {
        lessonWatchPoints: parseInt(String(map['lesson_watch_points'] ?? process.env.DEFAULT_LESSON_WATCH_POINTS ?? '1'), 10) || 1,
        lessonCompletePoints: parseInt(String(map['lesson_complete_points'] ?? process.env.DEFAULT_LESSON_COMPLETE_POINTS ?? '10'), 10) || 10,
        quizCompletePoints: parseInt(String(map['quiz_complete_points'] ?? process.env.DEFAULT_QUIZ_POINTS ?? '10'), 10) || 10,
        weeklyExamPoints: parseInt(String(map['weekly_exam_points'] ?? process.env.DEFAULT_WEEKLY_EXAM_POINTS ?? '50'), 10) || 50,
        monthlyExamPoints: parseInt(String(map['monthly_exam_points'] ?? process.env.DEFAULT_MONTHLY_EXAM_POINTS ?? '100'), 10) || 100,
        streakBonus: parseInt(String(map['streak_bonus'] ?? process.env.DEFAULT_STREAK_BONUS ?? '5'), 10) || 5,
        referralPoints: parseInt(String(map['referral_points'] ?? process.env.DEFAULT_REFERRAL_POINTS ?? '5'), 10) || 5,
        videoCompletionThreshold: parseInt(String(map['video_completion_threshold'] ?? '50'), 10) || 50,
    };
}

export async function awardPoints(options: AwardPointsOptions): Promise<AwardPointsResult> {
    await connectDB();

    const student = await User.findById(options.studentId).select('points level role status');
    if (!student) {
        return { success: false, newBalance: 0, error: 'الطالب غير موجود' };
    }

    if (student.role !== 'student') {
        return { success: false, newBalance: 0, error: 'المستخدم ليس طالباً' };
    }

    if (!options.allowNonApproved && options.type !== 'admin_adjustment' && student.status !== 'approved') {
        return { success: false, newBalance: student.points || 0, error: 'حساب الطالب غير مفعّل' };
    }

    // ── Idempotency Check: By idempotencyKey ──
    if (options.idempotencyKey) {
        const existingTx = await PointTransaction.findOne({
            student: options.studentId,
            idempotencyKey: options.idempotencyKey,
        }).lean() as any;

        if (existingTx) {
            return {
                success: true,
                newBalance: existingTx.balanceAfter,
                alreadyAwarded: true,
            };
        }
    }

    // ── Duplicate Prevention: By referenceId + type (for non-admin, non-bonus activities) ──
    if (options.referenceId && options.type && !['admin_adjustment', 'bonus'].includes(options.type)) {
        try {
            const refObjectId = new mongoose.Types.ObjectId(options.referenceId.toString());
            const existingRefTx = await PointTransaction.findOne({
                student: options.studentId,
                type: options.type,
                referenceId: refObjectId,
            }).lean() as any;

            if (existingRefTx) {
                return {
                    success: true,
                    newBalance: student.points || existingRefTx.balanceAfter,
                    alreadyAwarded: true,
                };
            }
        } catch {
            // If referenceId is not a valid ObjectId, continue
        }
    }

    const currentPoints = typeof student.points === 'number' ? student.points : 0;
    let effectiveAmount = options.amount;
    let newBalance = currentPoints + effectiveAmount;

    // Balance cannot go negative
    if (newBalance < 0) {
        effectiveAmount = -currentPoints;
        newBalance = 0;
    }

    try {
        // Atomic update of points and updatedAt for deterministic leaderboard ordering
        const updated = await User.findByIdAndUpdate(
            options.studentId,
            {
                $set: {
                    points: newBalance,
                    updatedAt: new Date(),
                },
            },
            { new: true }
        );

        const currentBalance = updated ? updated.points : newBalance;

        // Record immutable ledger transaction
        let refObjectId: mongoose.Types.ObjectId | undefined = undefined;
        if (options.referenceId && mongoose.Types.ObjectId.isValid(options.referenceId.toString())) {
            refObjectId = new mongoose.Types.ObjectId(options.referenceId.toString());
        }

        let createdByObjectId: mongoose.Types.ObjectId | undefined = undefined;
        if (options.awardedBy && mongoose.Types.ObjectId.isValid(options.awardedBy.toString())) {
            createdByObjectId = new mongoose.Types.ObjectId(options.awardedBy.toString());
        }

        await PointTransaction.create({
            student: options.studentId,
            amount: effectiveAmount,
            type: options.type,
            reason: options.reason,
            referenceId: refObjectId,
            referenceType: options.referenceType,
            balanceAfter: currentBalance,
            createdBy: createdByObjectId,
            idempotencyKey: options.idempotencyKey,
        });

        // Check level up
        const oldLevel = student.level || 1;
        const newLevel = await calculateLevel(currentBalance);
        let didLevelUp = false;

        if (newLevel > oldLevel) {
            await User.findByIdAndUpdate(options.studentId, { level: newLevel });
            didLevelUp = true;

            await Notification.create({
                user: options.studentId,
                type: 'general',
                title: 'تهانينا! ارتقيت مستوى',
                message: `لقد وصلت إلى المستوى ${newLevel}! استمر في التقدم.`,
            }).catch(() => {});
        }

        // Send points notification
        if (effectiveAmount > 0) {
            await Notification.create({
                user: options.studentId,
                type: 'points_earned',
                title: 'نقاط جديدة!',
                message: `حصلت على ${effectiveAmount} نقطة - ${options.reason}`,
            }).catch(() => {});
        }

        return {
            success: true,
            newBalance: currentBalance,
            levelUp: didLevelUp,
            newLevel: didLevelUp ? newLevel : undefined,
        };
    } catch (error) {
        console.error('Award points error:', error);
        return { success: false, newBalance: student.points || 0, error: 'فشل في حفظ وتحديث النقاط' };
    }
}

async function calculateLevel(points: number): Promise<number> {
    const levels = await Level.find({ isActive: true }).sort({ requiredPoints: -1 });
    for (const level of levels) {
        if (points >= level.requiredPoints) {
            return level.levelNumber;
        }
    }
    return 1;
}

export interface LeaderboardQueryOptions {
    limit?: number;
    grade?: string;
    includeZeroPoints?: boolean;
    search?: string;
}

export interface LeaderboardStudentItem {
    rank: number;
    studentId: string;
    name: string;
    phone?: string;
    avatar: string | null;
    grade?: string;
    points: number;
    level: number;
    updatedAt?: Date;
}

/**
 * جلب لوحة الشرف التلقائية مرتبة تنازلياً حسب رصيد النقاط الفعلي
 * مع تطبيق معايير كسر التعادل الثابتة (تاريخ الوصول للنقاط ثم المعرف _id)
 */
export async function getLeaderboard(
    options: number | LeaderboardQueryOptions = 10
): Promise<LeaderboardStudentItem[]> {
    await connectDB();

    const limit = typeof options === 'number' ? options : (options.limit || 10);
    const grade = typeof options === 'object' ? options.grade : undefined;
    const includeZeroPoints = typeof options === 'object' ? Boolean(options.includeZeroPoints) : false;
    const search = typeof options === 'object' ? options.search?.trim() : undefined;

    const filter: Record<string, any> = {
        role: 'student',
        status: 'approved',
    };

    if (grade && grade !== 'all' && grade.trim() !== '') {
        if (grade === 'second_secondary') {
            filter.grade = { $in: ['second_secondary', 'second_secondary_baccalaureate'] };
        } else {
            filter.grade = grade.trim();
        }
    }

    if (!includeZeroPoints) {
        filter.points = { $gt: 0 };
    } else {
        filter.points = { $gte: 0 };
    }

    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        filter.$or = [{ name: regex }, { phone: regex }];
    }

    // الترتيب الأساسي تنازلياً حسب مجموع النقاط
    // وعند تساوي النقاط: الأسبقية لمن وصل إلى الرصيد أولاً (updatedAt تصاعدياً) ثم المعرف _id كعامل حاسم ثابت
    const students = await User.find(filter)
        .select('name phone avatar grade points level updatedAt')
        .sort({ points: -1, updatedAt: 1, _id: 1 })
        .limit(limit)
        .lean();

    return students.map((s: any, i) => ({
        rank: i + 1,
        studentId: s._id.toString(),
        name: s.name || 'طالب متميز',
        phone: s.phone || '',
        avatar: s.avatar || null,
        grade: s.grade || '',
        points: typeof s.points === 'number' ? s.points : 0,
        level: s.level || 1,
        updatedAt: s.updatedAt,
    }));
}

/**
 * حساب مركز الطالب بدقة متوافقة 100% مع ترتيب لوحة الشرف
 */
export async function getStudentRank(
    studentId: string,
    options?: { grade?: string; includeZeroPoints?: boolean }
): Promise<number | null> {
    await connectDB();
    const student: any = await User.findById(studentId).select('points role status grade updatedAt').lean();
    if (!student || student.role !== 'student' || student.status !== 'approved') return null;

    const studentPoints = typeof student.points === 'number' ? student.points : 0;
    const includeZeroPoints = options?.includeZeroPoints ?? false;

    if (!includeZeroPoints && studentPoints <= 0) {
        return null;
    }

    const filter: Record<string, any> = {
        role: 'student',
        status: 'approved',
    };

    if (options?.grade && options.grade !== 'all') {
        if (options.grade === 'second_secondary') {
            filter.grade = { $in: ['second_secondary', 'second_secondary_baccalaureate'] };
        } else {
            filter.grade = options.grade;
        }
    }

    if (!includeZeroPoints) {
        filter.points = { $gt: 0 };
    }

    // معايير الترتيب التنافسي المطابقة تماماً لفرز لوحة الشرف
    const tieConditions: any[] = [{ points: { $gt: studentPoints } }];

    if (student.updatedAt) {
        tieConditions.push({
            points: studentPoints,
            updatedAt: { $lt: student.updatedAt },
        });
        tieConditions.push({
            points: studentPoints,
            updatedAt: student.updatedAt,
            _id: { $lt: student._id },
        });
    } else {
        tieConditions.push({
            points: studentPoints,
            _id: { $lt: student._id },
        });
    }

    filter.$or = tieConditions;

    const countAhead = await User.countDocuments(filter);
    return countAhead + 1;
}

export async function updateStreak(studentId: string): Promise<number> {
    await connectDB();
    const student = await User.findById(studentId).select('streak lastActivityDate');
    if (!student) return 0;

    const now = new Date();
    const lastActivity = student.lastActivityDate;
    let newStreak = student.streak;

    if (lastActivity) {
        const daysDiff = Math.floor(
            (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
            newStreak += 1;
        } else if (daysDiff > 1) {
            newStreak = 1;
        }
    } else {
        newStreak = 1;
    }

    await User.findByIdAndUpdate(studentId, {
        streak: newStreak,
        lastActivityDate: now,
    });

    // Award streak bonus if applicable
    const settings = await getGamificationSettings();
    const streakBonus = settings.streakBonus;
    if (newStreak > 0 && newStreak % 7 === 0) {
        await awardPoints({
            studentId,
            amount: streakBonus * newStreak,
            type: 'streak_bonus',
            reason: `مكافأة المداومة - ${newStreak} يوم متواصل`,
            idempotencyKey: `streak_${studentId}_${newStreak}_${now.toISOString().slice(0, 10)}`,
        });
    }

    return newStreak;
}

export interface StudentPointsBreakdown {
    totalPoints: number;
    videoPoints: number;
    examPoints: number;
    achievementPoints: number;
    referralPoints: number;
    adminAddedPoints: number;
    deductedPoints: number;
    recentTransactions: any[];
}

export async function getStudentPointsBreakdown(studentId: string | mongoose.Types.ObjectId): Promise<StudentPointsBreakdown> {
    await connectDB();
    const studentObjectId = new mongoose.Types.ObjectId(studentId.toString());

    const [user, transactions, summaryAgg] = await Promise.all([
        User.findById(studentObjectId).select('points level').lean(),
        PointTransaction.find({ student: studentObjectId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),
        PointTransaction.aggregate([
            { $match: { student: studentObjectId } },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    positiveAmount: {
                        $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
                    },
                    negativeAmount: {
                        $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] },
                    },
                },
            },
        ]),
    ]);

    const typeMap: Record<string, { total: number; positive: number; negative: number }> = {};
    for (const item of summaryAgg) {
        typeMap[item._id] = {
            total: item.totalAmount || 0,
            positive: item.positiveAmount || 0,
            negative: item.negativeAmount || 0,
        };
    }

    const videoPoints = (typeMap['lesson_completed']?.positive || 0) + (typeMap['lesson_watch']?.positive || 0);
    const examPoints = (typeMap['exam_completed']?.positive || 0) + (typeMap['quiz_completed']?.positive || 0);
    const achievementPoints = (typeMap['achievement']?.positive || 0) + (typeMap['task_completion']?.positive || 0);
    const referralPoints = typeMap['referral']?.positive || 0;
    const adminAddedPoints = typeMap['admin_adjustment']?.positive || 0;

    let deductedPoints = 0;
    for (const key of Object.keys(typeMap)) {
        deductedPoints += typeMap[key].negative;
    }

    return {
        totalPoints: (user as any)?.points || 0,
        videoPoints,
        examPoints,
        achievementPoints,
        referralPoints,
        adminAddedPoints,
        deductedPoints,
        recentTransactions: transactions.map((t: any) => ({
            id: t._id.toString(),
            amount: t.amount,
            type: t.type,
            reason: t.reason,
            balanceAfter: t.balanceAfter,
            createdAt: t.createdAt,
            referenceType: t.referenceType,
        })),
    };
}
