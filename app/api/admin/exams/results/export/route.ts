import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import User from '@/lib/db/models/User';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { gradeLabel } from '@/lib/constants/grades';
import { getSubjectLabel } from '@/lib/constants/subjects';
import mongoose from 'mongoose';

const TYPE_NAMES: Record<string, string> = {
    quiz: 'كويز حصة',
    weekly_exam: 'امتحان أسبوعي',
    monthly_exam: 'امتحان شهري',
    practice: 'تدريب بنك الأسئلة',
};

async function exportHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId') || '';
    const grade = searchParams.get('grade') || '';
    const examType = searchParams.get('examType') || '';
    const gradingStatus = searchParams.get('gradingStatus') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const filter: Record<string, any> = {
        status: 'submitted',
    };

    if (!examType || examType === 'exams_only') {
        filter.examType = { $in: ['quiz', 'weekly_exam', 'monthly_exam'] };
    } else if (examType !== 'all') {
        filter.examType = examType;
    }

    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
        filter.examRef = new mongoose.Types.ObjectId(examId);
    }

    if (gradingStatus === 'pending') {
        filter.hasUngradedEssays = true;
    } else if (gradingStatus === 'graded') {
        filter.hasUngradedEssays = false;
    }

    if (startDate || endDate) {
        filter.submittedAt = {};
        if (startDate) filter.submittedAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.submittedAt.$lte = end;
        }
    }

    if (search.trim() || grade) {
        const userFilter: Record<string, any> = { role: 'student' };
        if (grade) userFilter.grade = grade;
        if (search.trim()) {
            const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            userFilter.$or = [
                { name: { $regex: s, $options: 'i' } },
                { phone: { $regex: s, $options: 'i' } },
            ];
        }
        const matchedStudents = await User.find(userFilter).select('_id').lean();
        const studentIds = matchedStudents.map((s) => s._id);
        filter.student = { $in: studentIds };
    }

    const attempts = await ExamAttempt.find(filter)
        .populate('student', 'name phone grade')
        .populate('examRef', 'title type subject passingScore totalPoints')
        .sort({ submittedAt: -1 })
        .limit(2000)
        .lean() as any[];

    // CSV Headers
    const headers = [
        'اسم الطالب',
        'رقم الهاتف',
        'الصف الدراسي',
        'اسم الامتحان',
        'نوع الاختبار',
        'المادة',
        'تاريخ التسليم',
        'الدرجة',
        'الدرجة الكاملة',
        'النسبة المئوية',
        'النتيجة',
        'حالة التصحيح',
    ];

    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = attempts.map((a) => {
        const studentName = a.student?.name || 'غير معروف';
        const phone = a.student?.phone || '';
        const studentGrade = gradeLabel(a.student?.grade);
        const examTitle = a.examRef?.title || (a.examType === 'practice' ? 'تدريب بنك الأسئلة' : 'اختبار');
        const typeLabel = TYPE_NAMES[a.examType] || a.examType;
        const subject = getSubjectLabel(a.examRef?.subject);
        const dateStr = a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('ar-EG') : '';
        const score = a.score || 0;
        const total = a.totalPoints || 0;
        const pct = `${a.percentage || 0}%`;
        const resultStatus = a.hasUngradedEssays ? 'بانتظار تصحيح المقالي' : a.passed ? 'ناجح' : 'راسب';
        const correction = a.hasUngradedEssays ? 'غير مكتمل (مقالي معلق)' : 'مكتمل ومصحح';

        return [
            escapeCsv(studentName),
            escapeCsv(phone),
            escapeCsv(studentGrade),
            escapeCsv(examTitle),
            escapeCsv(typeLabel),
            escapeCsv(subject),
            escapeCsv(dateStr),
            escapeCsv(score),
            escapeCsv(total),
            escapeCsv(pct),
            escapeCsv(resultStatus),
            escapeCsv(correction),
        ].join(',');
    });

    // Add UTF-8 BOM for Arabic support in Excel
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');

    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="exam-results-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
}

export const GET = withAdmin(exportHandler);
