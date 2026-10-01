import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const token = getTokenFromRequest(req);
        const payload = token ? await verifyToken(token) : null;
        if (!payload || payload.role !== 'parent') {
            return NextResponse.json({ success: false, message: 'غير مصرح لك' }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { linkingCode } = body;

        if (!linkingCode) {
            return NextResponse.json({ success: false, message: 'كود الربط مطلوب' }, { status: 400 });
        }

        const student = await User.findOne({ parentLinkingCode: linkingCode.trim().toUpperCase(), role: 'student' });

        if (!student) {
            return NextResponse.json({ success: false, message: 'كود غير صحيح' }, { status: 404 });
        }

        if (student.linkedParent && student.linkedParent.toString() !== payload.userId) {
            return NextResponse.json({ success: false, message: 'هذا الطالب مرتبط بحساب ولي أمر آخر بالفعل' }, { status: 400 });
        }

        if (student.linkedParent && student.linkedParent.toString() === payload.userId) {
            return NextResponse.json({ success: true, message: 'الطالب مرتبط بحسابك بالفعل' }, { status: 200 });
        }

        // Proceed to link
        student.linkedParent = payload.userId;
        await student.save();

        const parent = await User.findById(payload.userId);
        if (parent && !parent.linkedStudents.includes(student._id)) {
            parent.linkedStudents.push(student._id);
            await parent.save();
        }

        return NextResponse.json({
            success: true,
            message: 'تم ربط حساب الطالب بنجاح',
            data: {
                studentId: student._id
            }
        });
    } catch (error) {
        console.error('Parent Linking error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ' }, { status: 500 });
    }
}
