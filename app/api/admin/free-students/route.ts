import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Subscription from '@/lib/db/models/Subscription';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { getFreeOfferStats, getFreeOfferSettings } from '@/lib/settings/freeOffer';
import { createAuditLog } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

export const revalidate = 0;

// GET /api/admin/free-students
async function getHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';
    const grade = searchParams.get('grade')?.trim() || '';
    const statusFilter = searchParams.get('status')?.trim() || 'all'; // active | expired | upcoming | paused | all
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));

    const now = new Date();

    const stats = await getFreeOfferStats();

    const query: any = {
        role: 'student',
        isFreeStudent: true,
    };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
        ];
    }

    if (grade && grade !== 'all') {
        if (grade === 'second_secondary') {
            query.grade = { $in: ['second_secondary', 'second_secondary_baccalaureate'] };
        } else {
            query.grade = grade;
        }
    }

    if (statusFilter === 'active') {
        query.subscriptionStatus = 'active';
        query.subscriptionStartDate = { $lte: now };
        query.subscriptionEndDate = { $gte: now };
    } else if (statusFilter === 'expired') {
        query.$or = [
            { subscriptionEndDate: { $lt: now } },
            { subscriptionStatus: 'expired' },
        ];
    } else if (statusFilter === 'upcoming') {
        query.subscriptionStartDate = { $gt: now };
    } else if (statusFilter === 'paused') {
        query.subscriptionStatus = { $in: ['suspended', 'cancelled'] };
    }

    // Counts across all free students
    const [
        totalFreeStudents,
        activeCount,
        expiredCount,
        upcomingCount,
        pausedCount,
        freeStudents,
    ] = await Promise.all([
        User.countDocuments({ role: 'student', isFreeStudent: true }),
        User.countDocuments({
            role: 'student',
            isFreeStudent: true,
            subscriptionStatus: 'active',
            subscriptionStartDate: { $lte: now },
            subscriptionEndDate: { $gte: now },
        }),
        User.countDocuments({
            role: 'student',
            isFreeStudent: true,
            $or: [
                { subscriptionEndDate: { $lt: now } },
                { subscriptionStatus: 'expired' },
            ],
        }),
        User.countDocuments({
            role: 'student',
            isFreeStudent: true,
            subscriptionStartDate: { $gt: now },
        }),
        User.countDocuments({
            role: 'student',
            isFreeStudent: true,
            subscriptionStatus: { $in: ['suspended', 'cancelled'] },
        }),
        User.find(query)
            .select('_id name phone grade freeSlotNumber subscriptionStatus subscriptionStartDate subscriptionEndDate createdAt points')
            .sort({ subscriptionEndDate: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);

    // Format students with computed live status
    const formattedStudents = freeStudents.map((st: any) => {
        const start = st.subscriptionStartDate ? new Date(st.subscriptionStartDate) : null;
        const end = st.subscriptionEndDate ? new Date(st.subscriptionEndDate) : null;

        let liveStatus: 'active' | 'expired' | 'upcoming' | 'paused' = 'active';
        if (st.subscriptionStatus === 'suspended' || st.subscriptionStatus === 'cancelled') {
            liveStatus = 'paused';
        } else if (start && start > now) {
            liveStatus = 'upcoming';
        } else if (end && end < now) {
            liveStatus = 'expired';
        } else if (st.subscriptionStatus === 'active') {
            liveStatus = 'active';
        } else {
            liveStatus = 'expired';
        }

        return {
            _id: st._id.toString(),
            name: st.name,
            phone: st.phone,
            grade: st.grade,
            points: st.points || 0,
            freeSlotNumber: st.freeSlotNumber,
            subscriptionStatus: st.subscriptionStatus,
            liveStatus,
            subscriptionStartDate: st.subscriptionStartDate,
            subscriptionEndDate: st.subscriptionEndDate,
            createdAt: st.createdAt,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            stats,
            counts: {
                total: totalFreeStudents,
                active: activeCount,
                expired: expiredCount,
                upcoming: upcomingCount,
                paused: pausedCount,
            },
            total: await User.countDocuments(query),
            page,
            pages: Math.ceil((await User.countDocuments(query)) / limit),
            students: formattedStudents,
        },
    });
}

// PATCH /api/admin/free-students
// Action: extend | shorten | pause | activate
async function patchHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const body = await req.json();
    const { studentId, action, amount, unit = 'days', reason } = body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
    }

    if (!action || !['extend', 'shorten', 'pause', 'activate'].includes(action)) {
        return NextResponse.json({ success: false, message: 'الإجراء المطلوب غير صالح' }, { status: 400 });
    }

    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason || trimmedReason.length < 3) {
        return NextResponse.json({ success: false, message: 'يرجى كتابة سبب الإجراء (3 أحرف على الأقل)' }, { status: 400 });
    }

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
        return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
    }

    const now = new Date();
    const currentEnd = student.subscriptionEndDate ? new Date(student.subscriptionEndDate) : new Date();
    const currentStart = student.subscriptionStartDate ? new Date(student.subscriptionStartDate) : now;

    let newEndDate = new Date(currentEnd);
    let newStatus = student.subscriptionStatus;

    const msPerUnit = unit === 'hours' ? 3600000 : 86400000;
    const numAmount = Math.max(1, parseInt(String(amount || '1'), 10));

    if (action === 'extend') {
        // If already expired, extend starting from now; otherwise add to currentEnd
        const baseDate = currentEnd < now ? now : currentEnd;
        newEndDate = new Date(baseDate.getTime() + numAmount * msPerUnit);
        newStatus = 'active';
    } else if (action === 'shorten') {
        newEndDate = new Date(currentEnd.getTime() - numAmount * msPerUnit);
        if (newEndDate <= currentStart) {
            newEndDate = new Date(currentStart.getTime() + 60000); // minimum 1 minute
        }
        if (newEndDate <= now) {
            newStatus = 'expired';
        }
    } else if (action === 'pause') {
        newStatus = 'suspended';
    } else if (action === 'activate') {
        newStatus = 'active';
        if (newEndDate < now) {
            // Give 30 days if activating an expired sub
            const settings = await getFreeOfferSettings();
            newEndDate = new Date(now.getTime() + settings.freeOfferDuration * 86400000);
        }
    }

    // Update User
    student.isFreeStudent = true;
    student.subscriptionStatus = newStatus as any;
    student.subscriptionEndDate = newEndDate;
    if (!student.subscriptionStartDate) {
        student.subscriptionStartDate = currentStart;
    }
    await student.save();

    // Update or create Subscription document
    let subDoc = await Subscription.findOne({
        studentId: student._id,
        source: 'free_offer',
    }).sort({ createdAt: -1 });

    const auditMeta = {
        action,
        amount: numAmount,
        unit,
        reason: trimmedReason,
        oldEndDate: currentEnd,
        newEndDate,
        newStatus,
        adminId: admin.userId,
    };

    if (subDoc) {
        subDoc.status = newStatus === 'active' ? 'active' : newStatus === 'expired' ? 'expired' : 'cancelled';
        subDoc.endDate = newEndDate;
        subDoc.notes = `${subDoc.notes || ''} | تعديل إداري (${action}): ${trimmedReason} [بواسطة الأدمن ${admin.userId}]`.trim();
        await subDoc.save();
    } else {
        await Subscription.create({
            studentId: student._id,
            gradeId: student.grade || 'all',
            status: newStatus === 'active' ? 'active' : 'expired',
            source: 'free_offer',
            startDate: currentStart,
            endDate: newEndDate,
            notes: `اشتراك مجاني تم إنشاؤه بواسطة الأدمن: ${trimmedReason}`,
        });
    }

    // Create Audit Log
    await createAuditLog({
        actor: admin.userId,
        actorRole: 'admin',
        action: `FREE_SUB_${action.toUpperCase()}`,
        target: studentId,
        targetModel: 'User',
        metadata: auditMeta,
    });

    const actionArabic =
        action === 'extend' ? 'تمديد' : action === 'shorten' ? 'تقصير' : action === 'pause' ? 'إيقاف' : 'إعادة تفعيل';

    return NextResponse.json({
        success: true,
        message: `تم ${actionArabic} الاشتراك المجاني للطالب ${student.name} بنجاح`,
        data: {
            studentId,
            subscriptionStatus: newStatus,
            subscriptionEndDate: newEndDate,
        },
    });
}

export const GET = withAdmin(getHandler);
export const PATCH = withAdmin(patchHandler);
