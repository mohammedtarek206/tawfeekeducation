import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Material from '@/lib/db/models/Material';
import User from '@/lib/db/models/User';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/student/study-notes
async function getHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const studentUser = await User.findById(student.userId).select('grade subscriptionStatus subscriptionEndDate');
    if (!studentUser) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });

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

    const isSubscribed = studentUser.subscriptionStatus === 'active' &&
        (!studentUser.subscriptionEndDate || new Date() <= new Date(studentUser.subscriptionEndDate));

    const safeNotes = notes.map((note) => ({
        ...note,
        driveUrl: isSubscribed ? note.driveUrl : null
    }));

    return NextResponse.json({ success: true, data: { notes: safeNotes, requireSubscription: !isSubscribed } });
}

export const GET = withStudent(getHandler);
