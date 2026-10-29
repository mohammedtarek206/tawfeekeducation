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
}

export interface AwardPointsResult {
    success: boolean;
    newBalance: number;
    levelUp?: boolean;
    newLevel?: number;
    error?: string;
}

export async function awardPoints(options: AwardPointsOptions): Promise<AwardPointsResult> {
    await connectDB();

    const student = await User.findById(options.studentId).select('points level role status');
    if (!student) {
        return { success: false, newBalance: 0, error: 'Student not found' };
    }

    if (student.role !== 'student' || student.status !== 'approved') {
        return { success: false, newBalance: 0, error: 'Invalid student' };
    }

    const newBalance = Math.max(0, student.points + options.amount);

    try {
        // Try atomic update
        const updated = await User.findByIdAndUpdate(
            options.studentId,
            { $inc: { points: options.amount } },
            { new: true }
        );

        const currentBalance = updated ? updated.points : newBalance;

        // Record transaction
        await PointTransaction.create({
            student: options.studentId,
            amount: options.amount,
            type: options.type,
            reason: options.reason,
            referenceId: options.referenceId,
            referenceType: options.referenceType,
            balanceAfter: currentBalance,
            createdBy: options.awardedBy,
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
            });
        }

        // Send points notification
        if (options.amount > 0) {
            await Notification.create({
                user: options.studentId,
                type: 'points_earned',
                title: 'نقاط جديدة!',
                message: `حصلت على ${options.amount} نقطة - ${options.reason}`,
            });
        }

        return {
            success: true,
            newBalance: currentBalance,
            levelUp: didLevelUp,
            newLevel: didLevelUp ? newLevel : undefined,
        };
    } catch (error) {
        console.error('Award points error:', error);
        return { success: false, newBalance: student.points, error: 'Failed to award points' };
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
    const streakBonus = parseInt(process.env.DEFAULT_STREAK_BONUS || '5');
    if (newStreak > 0 && newStreak % 7 === 0) {
        await awardPoints({
            studentId,
            amount: streakBonus * newStreak,
            type: 'streak_bonus',
            reason: `مكافأة المداومة - ${newStreak} يوم متواصل`,
        });
    }

    return newStreak;
}
