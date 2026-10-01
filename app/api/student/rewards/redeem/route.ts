import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Reward from '@/lib/db/models/Reward';
import RewardRedemption from '@/lib/db/models/RewardRedemption';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { awardPoints } from '@/lib/gamification/engine';
import mongoose from 'mongoose';

// POST /api/student/rewards/redeem - redeem a reward
async function postHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { rewardId } = body;

    if (!rewardId || !mongoose.Types.ObjectId.isValid(rewardId)) {
        return NextResponse.json({ success: false, message: 'معرف الجائزة غير صحيح' }, { status: 400 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const [reward, studentUser] = await Promise.all([
            Reward.findOne({ _id: rewardId, isActive: true }).session(session),
            User.findById(student.userId).select('points').session(session),
        ]);

        if (!reward) {
            await session.abortTransaction();
            return NextResponse.json({ success: false, message: 'الجائزة غير متاحة' }, { status: 404 });
        }

        if (!studentUser) {
            await session.abortTransaction();
            return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
        }

        // Check expiration
        if (reward.expiresAt && reward.expiresAt < new Date()) {
            await session.abortTransaction();
            return NextResponse.json({ success: false, message: 'انتهت صلاحية هذه الجائزة' }, { status: 400 });
        }

        // Check quantity
        if (reward.quantity !== -1 && reward.redeemedCount >= reward.quantity) {
            await session.abortTransaction();
            return NextResponse.json({ success: false, message: 'نفدت كمية هذه الجائزة' }, { status: 400 });
        }

        // Check points
        if (studentUser.points < reward.requiredPoints) {
            await session.abortTransaction();
            return NextResponse.json(
                {
                    success: false,
                    message: `نقاطك غير كافية. تحتاج ${reward.requiredPoints} نقطة`,
                },
                { status: 400 }
            );
        }

        // Check existing pending redemption
        const existing = await RewardRedemption.findOne({
            student: student.userId,
            reward: rewardId,
            status: { $in: ['pending', 'approved'] },
        }).session(session);

        if (existing) {
            await session.abortTransaction();
            return NextResponse.json(
                { success: false, message: 'لديك طلب استرداد معلق لهذه الجائزة' },
                { status: 400 }
            );
        }

        // Deduct points SERVER-SIDE
        await User.findByIdAndUpdate(
            student.userId,
            { $inc: { points: -reward.requiredPoints } },
            { session }
        );

        await RewardRedemption.create(
            [
                {
                    student: student.userId,
                    reward: rewardId,
                    pointsSpent: reward.requiredPoints,
                    status: 'pending',
                },
            ],
            { session }
        );

        // Increment redeemed count
        await Reward.findByIdAndUpdate(rewardId, { $inc: { redeemedCount: 1 } }, { session });

        // Create point transaction
        const { default: PointTransaction } = await import('@/lib/db/models/PointTransaction');
        await PointTransaction.create(
            [
                {
                    student: student.userId,
                    amount: -reward.requiredPoints,
                    type: 'reward_redeemed',
                    reason: `استرداد جائزة: ${reward.name}`,
                    referenceId: rewardId,
                    referenceType: 'Reward',
                    balanceAfter: studentUser.points - reward.requiredPoints,
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return NextResponse.json({
            success: true,
            message: 'تم تقديم طلب الاسترداد بنجاح، في انتظار موافقة الإدارة',
            data: { newBalance: studentUser.points - reward.requiredPoints },
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Reward redemption error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 });
    } finally {
        session.endSession();
    }
}

export const POST = withStudent(postHandler);
