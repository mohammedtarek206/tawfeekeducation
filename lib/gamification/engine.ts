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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const student = await User.findById(options.studentId)
            .select('points level role status')
            .session(session);

        if (!student) {
            await session.abortTransaction();
            return { success: false, newBalance: 0, error: 'Student not found' };
        }

        if (student.role !== 'student' || student.status !== 'approved') {
            await session.abortTransaction();
            return { success: false, newBalance: 0, error: 'Invalid student' };
        }

        const newBalance = Math.max(0, student.points + options.amount);

        await User.findByIdAndUpdate(
            options.studentId,
            { $inc: { points: options.amount } },
            { session }
        );

        await PointTransaction.create(
            [
                {
                    student: options.studentId,
                    amount: options.amount,
                    type: options.type,
                    reason: options.reason,
                    referenceId: options.referenceId,
                    referenceType: options.referenceType,
                    balanceAfter: newBalance,
                    createdBy: options.awardedBy,
                },
            ],
            { session }
        );

        // Check level up
        const oldLevel = student.level;
        const newLevel = await calculateLevel(newBalance);
        let didLevelUp = false;

        if (newLevel > oldLevel) {
            await User.findByIdAndUpdate(options.studentId, { level: newLevel }, { session });
            didLevelUp = true;

            // Send level up notification
            await Notification.create(
                [
                    {
                        user: options.studentId,
                        type: 'general',
                        title: 'تهانينا! ارتقيت مستوى',
                        message: `لقد وصلت إلى المستوى ${newLevel}! استمر في التقدم.`,
                    },
                ],
                { session }
            );
        }

        // Send points notification
        if (options.amount > 0) {
            await Notification.create(
                [
                    {
                        user: options.studentId,
                        type: 'points_earned',
                        title: 'نقاط جديدة!',
                        message: `حصلت على ${options.amount} نقطة - ${options.reason}`,
                    },
                ],
                { session }
            );
        }

        await session.commitTransaction();

        return {
            success: true,
            newBalance,
            levelUp: didLevelUp,
            newLevel: didLevelUp ? newLevel : undefined,
        };
    } catch (error) {
        await session.abortTransaction();
        console.error('Award points error:', error);
        return { success: false, newBalance: 0, error: 'Failed to award points' };
    } finally {
        session.endSession();
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

export async function getLeaderboard(limit = 10): Promise<
    Array<{
        rank: number;
        studentId: string;
        name: string;
        points: number;
        level: number;
        grade?: string;
    }>
> {
    await connectDB();

    const students = await User.find({ role: 'student', status: 'approved' })
        .select('name points level grade')
        .sort({ points: -1 })
        .limit(limit)
        .lean();

    return students.map((s: any, i) => ({
        rank: i + 1,
        studentId: s._id.toString(),
        name: s.name,
        points: s.points,
        level: s.level,
        grade: s.grade,
    }));
}

export async function getStudentRank(studentId: string): Promise<number> {
    await connectDB();
    const student: any = await User.findById(studentId).select('points').lean();
    if (!student) return 0;

    const rank = await User.countDocuments({
        role: 'student',
        status: 'approved',
        points: { $gt: student.points },
    });

    return rank + 1;
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
