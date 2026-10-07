import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Referral from '@/lib/db/models/Referral';
import Notification from '@/lib/db/models/Notification';
import { withAdmin } from '@/lib/auth/middleware';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import { awardPoints } from '@/lib/gamification/engine';
import mongoose from 'mongoose';

// GET /api/admin/students - list students with filters
async function handler(req: NextRequest): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const grade = searchParams.get('grade') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filter: Record<string, unknown> = { role: 'student' };
    if (status) filter.status = status;
    if (grade) filter.grade = grade;
    if (search) {
        filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }];
    }

    const total = await User.countDocuments(filter);
    const students = await User.find(filter)
        .select('name phone grade governorate status phoneVerified isFreeStudent subscriptionStatus subscriptionEndDate points level referralCode parentName parentPhone createdAt lastLogin')
        .sort({ createdAt: -1 })
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
        },
    });
}

export const GET = withAdmin(handler);
