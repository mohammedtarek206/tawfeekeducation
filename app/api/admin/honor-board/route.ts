import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import HonorBoard from '@/lib/db/models/HonorBoard';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

// GET /api/admin/honor-board - List students in honor board
async function getHandler(
    req: NextRequest,
    _ctx: unknown,
    _admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const grade = searchParams.get('grade')?.trim() || '';
        const search = searchParams.get('search')?.trim() || '';

        // Query honor board entries sorted by manual rank
        const entries = await HonorBoard.find()
            .sort({ rank: 1, createdAt: 1 })
            .populate({
                path: 'student',
                select: 'name phone grade avatar points level status',
            })
            .populate({
                path: 'addedBy',
                select: 'name',
            })
            .lean();

        // Format entries and fetch real-time data
        let formatted = entries
            .filter((e: any) => e.student && e.student.status !== 'suspended')
            .map((e: any) => ({
                id: e._id.toString(),
                studentId: e.student._id.toString(),
                name: e.student.name || 'طالب',
                phone: e.student.phone || '',
                grade: e.student.grade || '',
                avatar: e.student.avatar || null,
                points: typeof e.student.points === 'number' ? e.student.points : 0,
                level: e.student.level || 1,
                rank: e.rank,
                note: e.note || '',
                addedByName: e.addedBy?.name || 'الأدمن',
                createdAt: e.createdAt,
                updatedAt: e.updatedAt,
            }));

        // Filter by grade if specified
        if (grade) {
            formatted = formatted.filter((item) => item.grade === grade);
        }

        // Filter by search if specified
        if (search) {
            const lowerSearch = search.toLowerCase();
            formatted = formatted.filter(
                (item) =>
                    item.name.toLowerCase().includes(lowerSearch) ||
                    item.phone.includes(lowerSearch) ||
                    item.studentId.includes(lowerSearch)
            );
        }

        // Stats
        const total = formatted.length;
        const topStudent = formatted[0] || null;
        const highestPoints = topStudent ? topStudent.points : 0;

        return NextResponse.json({
            success: true,
            data: {
                leaderboard: formatted,
                stats: {
                    totalRankedStudents: total,
                    topStudentName: topStudent?.name ?? null,
                    highestPoints,
                    lastUpdated: new Date().toISOString(),
                },
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board GET] error:', message);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ في الخادم أثناء جلب لوحة الشرف', detail: message },
            { status: 500 }
        );
    }
}

// POST /api/admin/honor-board - Add a student to honor board with a manual rank
async function postHandler(
    req: NextRequest,
    _ctx: unknown,
    admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, message: 'طلب غير صالح' }, { status: 400 });
        }

        const { studentId, rank, note } = body || {};

        if (!studentId) {
            return NextResponse.json({ success: false, message: 'معرف الطالب مطلوب' }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
        }

        const targetRank = parseInt(rank, 10);
        if (isNaN(targetRank) || targetRank < 1) {
            return NextResponse.json({ success: false, message: 'يجب تحديد رقم مركز صحيح (1 أو أكثر)' }, { status: 400 });
        }

        // Check student exists and is active
        const student = await User.findById(studentId).select('name phone points grade status role');
        if (!student || student.role !== 'student') {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود' }, { status: 404 });
        }

        // Check if already in honor board
        const existing = await HonorBoard.findOne({ student: studentId });
        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    message: `الطالب مضاف بالفعل في لوحة الشرف بالمركز #${existing.rank}. يمكنك تعديل مركزه بدلاً من إضافته مجدداً.`,
                },
                { status: 400 }
            );
        }

        // Shift existing students with rank >= targetRank up by 1 to make room cleanly
        await HonorBoard.updateMany({ rank: { $gte: targetRank } }, { $inc: { rank: 1 } });

        // Create new entry
        const newEntry = await HonorBoard.create({
            student: studentId,
            rank: targetRank,
            note: String(note || '').trim(),
            addedBy: admin.userId,
        });

        // Audit log
        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: AUDIT_ACTIONS.HONOR_BOARD_STUDENT_ADDED,
            target: studentId,
            targetModel: 'HonorBoard',
            metadata: {
                studentName: student.name,
                rank: targetRank,
                note: note || '',
            },
        });

        return NextResponse.json({
            success: true,
            message: `تمت إضافة الطالب ${student.name} إلى لوحة الشرف بالمركز #${targetRank} بنجاح`,
            data: {
                id: newEntry._id.toString(),
                studentId,
                name: student.name,
                rank: targetRank,
                points: student.points || 0,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board POST] error:', message);
        return NextResponse.json(
            { success: false, message: 'فشل إضافة الطالب إلى لوحة الشرف', detail: message },
            { status: 500 }
        );
    }
}

// PUT /api/admin/honor-board - Update rank / reorder students
async function putHandler(
    req: NextRequest,
    _ctx: unknown,
    admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, message: 'طلب غير صالح' }, { status: 400 });
        }

        // Mode 1: Bulk reorder list of { studentId, rank }
        if (Array.isArray(body.entries)) {
            const updates = body.entries as Array<{ studentId: string; rank: number; note?: string }>;

            for (const item of updates) {
                if (item.studentId && typeof item.rank === 'number' && item.rank >= 1) {
                    const updateObj: any = { rank: item.rank };
                    if (item.note !== undefined) updateObj.note = String(item.note).trim();
                    await HonorBoard.updateOne({ student: item.studentId }, { $set: updateObj });
                }
            }

            await createAuditLog({
                actor: admin.userId,
                actorRole: 'admin',
                action: AUDIT_ACTIONS.HONOR_BOARD_RANK_UPDATED,
                metadata: {
                    type: 'bulk_reorder',
                    count: updates.length,
                },
            });

            return NextResponse.json({
                success: true,
                message: 'تم حفظ ترتيب لوحة الشرف بنجاح',
            });
        }

        // Mode 2: Single student rank / note update
        const { studentId, rank, note } = body || {};
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
        }

        const targetRank = parseInt(rank, 10);
        if (isNaN(targetRank) || targetRank < 1) {
            return NextResponse.json({ success: false, message: 'المركز يجب أن يكون عدداً أكبر من أو يساوي 1' }, { status: 400 });
        }

        const entry = await HonorBoard.findOne({ student: studentId }).populate('student', 'name');
        if (!entry) {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود في لوحة الشرف' }, { status: 404 });
        }

        const oldRank = entry.rank;
        entry.rank = targetRank;
        if (note !== undefined) {
            entry.note = String(note).trim();
        }
        await entry.save();

        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: AUDIT_ACTIONS.HONOR_BOARD_RANK_UPDATED,
            target: studentId,
            targetModel: 'HonorBoard',
            metadata: {
                studentName: (entry.student as any)?.name || '',
                oldRank,
                newRank: targetRank,
                note: entry.note,
            },
        });

        return NextResponse.json({
            success: true,
            message: `تم تحديث مركز الطالب إلى #${targetRank} بنجاح`,
            data: {
                studentId,
                rank: targetRank,
                note: entry.note,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board PUT] error:', message);
        return NextResponse.json(
            { success: false, message: 'فشل تحديث الترتيب', detail: message },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/honor-board - Remove student from honor board ONLY
async function deleteHandler(
    req: NextRequest,
    _ctx: unknown,
    admin: JWTPayload
): Promise<NextResponse> {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        let studentId = searchParams.get('studentId');

        if (!studentId) {
            try {
                const body = await req.json();
                studentId = body?.studentId;
            } catch {
                // query param fallback
            }
        }

        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ success: false, message: 'معرف الطالب غير صحيح' }, { status: 400 });
        }

        const deleted = await HonorBoard.findOneAndDelete({ student: studentId }).populate('student', 'name');
        if (!deleted) {
            return NextResponse.json({ success: false, message: 'الطالب غير موجود في لوحة الشرف' }, { status: 404 });
        }

        const studentName = (deleted.student as any)?.name || 'الطالب';

        // Normalize remaining ranks sequentially (1, 2, 3...)
        const remaining = await HonorBoard.find().sort({ rank: 1, createdAt: 1 });
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].rank !== i + 1) {
                remaining[i].rank = i + 1;
                await remaining[i].save();
            }
        }

        // Audit log
        await createAuditLog({
            actor: admin.userId,
            actorRole: 'admin',
            action: AUDIT_ACTIONS.HONOR_BOARD_STUDENT_REMOVED,
            target: studentId,
            targetModel: 'HonorBoard',
            metadata: {
                studentName,
                removedRank: deleted.rank,
            },
        });

        return NextResponse.json({
            success: true,
            message: `تمت إزالة ${studentName} من لوحة الشرف بنجاح (لم يتم حذف حسابه أو نقاطه)`,
            data: {
                studentId,
                removedRank: deleted.rank,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[honor-board DELETE] error:', message);
        return NextResponse.json(
            { success: false, message: 'فشل إزالة الطالب من لوحة الشرف', detail: message },
            { status: 500 }
        );
    }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
export const PUT = withAdmin(putHandler);
export const DELETE = withAdmin(deleteHandler);
