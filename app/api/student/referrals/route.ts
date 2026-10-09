import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Referral from '@/lib/db/models/Referral';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { ensureUserReferralCode, getReferralSettings } from '@/lib/referrals/processor';

async function handler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('name phone referralCode points');
    if (!studentUser) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    const referralCode = await ensureUserReferralCode(studentUser);
    const settings = await getReferralSettings();

    const origin = req.nextUrl.origin || 'https://tawfeekeducation.com';
    const referralLink = `${origin}/register?ref=${referralCode}`;

    // Fetch all referrals by this student
    const referrals = await Referral.find({ referrer: student.userId })
        .populate('referred', 'name phone grade status createdAt')
        .sort({ createdAt: -1 })
        .lean();

    const stats = {
        total: referrals.length,
        pending: referrals.filter((r: any) => r.status === 'pending').length,
        approved: referrals.filter((r: any) => r.status === 'approved' || r.status === 'verified').length,
        rewarded: referrals.filter((r: any) => r.status === 'rewarded').length,
        totalPointsEarned: referrals
            .filter((r: any) => r.status === 'rewarded')
            .reduce((sum: number, r: any) => sum + (r.pointsAmount || 0), 0),
    };

    const formattedList = referrals.map((r: any) => {
        const refStudent = r.referred || {};
        // Mask phone for privacy: 010****1234
        const rawPhone = refStudent.phone || '';
        const maskedPhone = rawPhone.length === 11
            ? `${rawPhone.substring(0, 3)}****${rawPhone.substring(7)}`
            : rawPhone;

        let displayStatus = 'في الانتظار';
        if (r.status === 'rewarded') displayStatus = 'تم منح المكافأة 🎉';
        else if (r.status === 'approved' || r.status === 'verified') displayStatus = 'مقبول وفي انتظار تفعيل المكافأة';
        else if (r.status === 'rejected') displayStatus = 'مرفوض';

        return {
            id: r._id,
            name: refStudent.name || 'طالب جديد',
            phone: maskedPhone,
            grade: refStudent.grade || '',
            status: r.status,
            displayStatus,
            pointsAwarded: r.pointsAwarded,
            pointsAmount: r.pointsAmount || 0,
            createdAt: r.createdAt,
            rewardedAt: r.rewardedAt || null,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            referralCode,
            referralLink,
            settings: {
                rewardPoints: settings.referralPoints,
                rule: settings.referralQualificationRule,
                enabled: settings.referralEnabled,
            },
            stats,
            referrals: formattedList,
        },
    });
}

export const GET = withStudent(handler);
