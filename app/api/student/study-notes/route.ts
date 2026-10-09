import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Material from '@/lib/db/models/Material';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

import { checkStudentAccess } from '@/lib/subscriptions/checkAccess';

// GET /api/student/study-notes
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('grade status subscriptionStatus subscriptionEndDate').lean() as any;
    if (!studentUser) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });

    const access = await checkStudentAccess(student.userId, { grade: studentUser.grade });

    const filter: Record<string, any> = {
        type: 'notes',
        isPublished: true,
    };
    if (studentUser.grade && studentUser.grade.trim() !== '') {
        filter.$or = [{ grade: studentUser.grade }, { grade: '' }];
    }

    const notes = await Material.find(filter)
        .select('title description driveUrl grade subject createdAt')
        .sort({ createdAt: -1 })
        .lean();

    const isSubscribed = access.canAccess;

    const safeNotes = notes.map((note) => ({
        ...note,
        driveUrl: isSubscribed ? note.driveUrl : null
    }));

    return NextResponse.json({
        success: true,
        data: { notes: safeNotes, requireSubscription: !isSubscribed, reason: access.reason }
    });
}

export const GET = withStudent(getHandler);
