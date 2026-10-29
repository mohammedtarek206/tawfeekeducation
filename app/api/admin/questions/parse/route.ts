import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import Exam from '@/lib/db/models/Exam';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import {
    parseQuestionsFromText,
    extractTextFromDocx,
    extractTextFromPdf,
    ParsedItem,
} from '@/lib/utils/questionParser';
import { createAuditLog } from '@/lib/security/auditLog';
import mongoose from 'mongoose';

function detectDuplicates(
    parsed: Array<{ text: string }>,
    existing: Array<{ text: string }>
): Set<number> {
    const dupes = new Set<number>();
    const existingNorm = (existing || [])
        .map((q) => (q && typeof q.text === 'string' ? q.text.trim().toLowerCase() : ''))
        .filter(Boolean);
    const seenInBatch = new Map<string, number>();

    (parsed || []).forEach((p, idx) => {
        const norm = (p && typeof p.text === 'string' ? p.text.trim().toLowerCase() : '');
        if (!norm) return;
        if (existingNorm.includes(norm)) {
            dupes.add(idx);
        } else if (seenInBatch.has(norm)) {
            dupes.add(idx);
        } else {
            seenInBatch.set(norm, idx);
        }
    });
    return dupes;
}

// POST /api/admin/questions/parse — parse text or uploaded file (TXT, DOCX, PDF) and return preview
async function parseHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    try {
        const contentType = req.headers.get('content-type') || '';
        let text = '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const textParam = formData.get('text') as string | null;

            if (file && typeof file === 'object' && 'arrayBuffer' in file) {
                const fileName = (file.name || '').toLowerCase();
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                if (buffer.length > 10 * 1024 * 1024) {
                    return NextResponse.json(
                        { success: false, message: 'حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت)', errorCode: 'FILE_TOO_LARGE' },
                        { status: 400 }
                    );
                }

                if (fileName.endsWith('.docx')) {
                    text = await extractTextFromDocx(buffer);
                } else if (fileName.endsWith('.pdf')) {
                    text = await extractTextFromPdf(buffer);
                } else if (fileName.endsWith('.txt')) {
                    text = buffer.toString('utf-8');
                } else {
                    return NextResponse.json(
                        { success: false, message: 'نوع الملف غير مدعوم. الصيغ المدعومة هي TXT و DOCX و PDF فقط.', errorCode: 'UNSUPPORTED_FILE_TYPE' },
                        { status: 400 }
                    );
                }
            } else if (textParam) {
                text = textParam;
            }
        } else {
            const body = await req.json().catch(() => ({}));
            text = body.text || '';
        }

        if (!text || typeof text !== 'string' || text.trim().length < 5) {
            return NextResponse.json(
                { success: false, message: 'النص فارغ أو قصير جداً للتحليل', errorCode: 'EMPTY_TEXT' },
                { status: 400 }
            );
        }

        const parsed = parseQuestionsFromText(text);

        if (!parsed.length) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'لم يتم التعرف على أي أسئلة صالحة. يرجى التأكد من اتباع الصيغة المحددة (س: السؤال ثم ج: الإجابة أو الخيارات).',
                    errorCode: 'NO_VALID_QUESTIONS_FOUND',
                },
                { status: 400 }
            );
        }

        // Check for duplicates in DB safely
        let existingQuestions: Array<{ text: string }> = [];
        try {
            await connectDB();
            const questionTexts = parsed
                .map((p) => (p && typeof p.text === 'string' ? p.text.trim() : ''))
                .filter(Boolean);
            if (questionTexts.length > 0) {
                existingQuestions = (await Question.find({
                    text: { $in: questionTexts },
                })
                    .select('text')
                    .lean()) as Array<{ text: string }>;
            }
        } catch (dbErr: any) {
            console.warn('[Question Parse] Database duplicate check warning:', dbErr?.message || dbErr);
            existingQuestions = [];
        }

        const duplicateIndices = detectDuplicates(parsed, existingQuestions);

        const preview = parsed.map((p, idx) => ({
            ...p,
            isDuplicate: duplicateIndices.has(idx),
            index: idx,
        }));

        return NextResponse.json({
            success: true,
            data: {
                preview,
                stats: {
                    total: parsed.length,
                    valid: parsed.filter((p) => p.valid).length,
                    invalid: parsed.filter((p) => !p.valid).length,
                    duplicates: duplicateIndices.size,
                },
            },
        });
    } catch (err: any) {
        console.error('[Question Parse API Error]:', {
            message: err?.message,
            stack: err?.stack,
        });
        return NextResponse.json(
            {
                success: false,
                message: err?.message || 'حدث خطأ غير متوقع أثناء تحليل النص أو الملف',
                errorCode: 'PARSE_INTERNAL_ERROR',
            },
            { status: 500 }
        );
    }
}

// POST /api/admin/questions/parse?action=import — save parsed questions to DB (and optionally link to an Exam)
async function importHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    try {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const { questions, grade, subject, difficulty, examId } = body;

        if (!questions || !Array.isArray(questions) || !questions.length) {
            return NextResponse.json({ success: false, message: 'لا توجد أسئلة للاستيراد', errorCode: 'NO_QUESTIONS' }, { status: 400 });
        }

        let targetExam: any = null;
        if (examId) {
            if (!mongoose.Types.ObjectId.isValid(examId)) {
                return NextResponse.json({ success: false, message: 'معرف الامتحان غير صالح', errorCode: 'INVALID_EXAM_ID' }, { status: 400 });
            }
            targetExam = await Exam.findById(examId);
            if (!targetExam) {
                return NextResponse.json({ success: false, message: 'الامتحان المحدد غير موجود', errorCode: 'EXAM_NOT_FOUND' }, { status: 404 });
            }
        }

        const effectiveGrade = grade || targetExam?.grade;
        const effectiveSubject = subject || targetExam?.subject || 'uncategorized';

        if (!effectiveGrade) return NextResponse.json({ success: false, message: 'يرجى تحديد الصف الدراسي', errorCode: 'MISSING_GRADE' }, { status: 400 });
        if (!effectiveSubject) return NextResponse.json({ success: false, message: 'يرجى تحديد المادة الدراسية', errorCode: 'MISSING_SUBJECT' }, { status: 400 });

        const toInsert = questions
            .filter((q: any) => !q.skip && q.text && q.text.trim())
            .map((q: any) => {
                let parsedChoices: Array<{ text: string; isCorrect: boolean }> = [];
                const qType = (q.type === 'essay' ? 'essay' : q.type === 'true_false' ? 'true_false' : 'mcq') as 'mcq' | 'true_false' | 'essay';

                const answerText = (q.correctAnswer || q.modelAnswer || q.answer || '').trim();

                if (qType === 'mcq') {
                    const opts = Array.isArray(q.options) ? q.options : [];
                    parsedChoices = opts.map((opt: string, i: number) => ({
                        text: typeof opt === 'string' ? opt.trim() : String(opt),
                        isCorrect: i === q.correctIndex || opt.trim() === answerText,
                    }));

                    // If still no correct answer found and options exist, fallback to first choice
                    if (!parsedChoices.some((c) => c.isCorrect) && parsedChoices.length > 0) {
                        parsedChoices[0].isCorrect = true;
                    }
                } else if (qType === 'true_false') {
                    const isTrue = answerText === 'صح' || answerText.toLowerCase() === 'true' || answerText === 'صحيح' || q.correctIndex === 0;
                    parsedChoices = [
                        { text: 'صح', isCorrect: isTrue },
                        { text: 'خطأ', isCorrect: !isTrue },
                    ];
                } else {
                    // Essay
                    parsedChoices = [];
                }

                const pts = Number(q.points) > 0 ? Number(q.points) : 1;

                return {
                    text: q.text.trim(),
                    type: qType,
                    choices: parsedChoices,
                    correctAnswer: answerText || undefined,
                    explanation: q.explanation ? String(q.explanation).trim() : undefined,
                    modelAnswer: qType === 'essay' ? answerText || undefined : undefined,
                    gradingCriteria: qType === 'essay' ? String(q.gradingCriteria || '').trim() || undefined : undefined,
                    difficulty: difficulty || q.difficulty || 'medium',
                    subject: effectiveSubject,
                    grade: effectiveGrade,
                    examId: targetExam ? targetExam._id : undefined,
                    isActive: true,
                    usageCount: 0,
                    order: 0,
                    points: pts,
                    tags: [],
                    createdBy: admin.userId,
                };
            });

        if (!toInsert.length) {
            return NextResponse.json({ success: false, message: 'لا توجد أسئلة صالحة للاستيراد بعد الفلترة', errorCode: 'NO_VALID_QUESTIONS' }, { status: 400 });
        }

        const inserted = await Question.insertMany(toInsert);

        // If imported into an exam, link questions and update exam total points
        if (targetExam) {
            const newIds = inserted.map((q) => q._id);
            targetExam.questions = targetExam.questions || [];
            targetExam.questions.push(...newIds);

            const addedPoints = inserted.reduce((sum, q) => sum + (q.points || 1), 0);
            targetExam.totalPoints = (targetExam.totalPoints || 0) + addedPoints;
            await targetExam.save();

            await createAuditLog({
                actor: admin.userId,
                actorRole: 'admin',
                action: 'QUESTION_IMPORT',
                target: targetExam._id.toString(),
                targetModel: 'Exam',
                metadata: {
                    examId: targetExam._id,
                    importedCount: inserted.length,
                    addedPoints,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: targetExam
                ? `تم استيراد ${inserted.length} سؤال وربطها بالامتحان «${targetExam.title}» بنجاح`
                : `تم استيراد ${inserted.length} سؤال إلى بنك الأسئلة بنجاح`,
            data: {
                count: inserted.length,
                examId: targetExam ? targetExam._id : null,
                examTitle: targetExam ? targetExam.title : null,
            },
        });
    } catch (err: any) {
        console.error('[Question Import Error]:', {
            message: err?.message,
            stack: err?.stack,
        });
        return NextResponse.json(
            { success: false, message: err?.message || 'حدث خطأ أثناء حفظ الأسئلة في قاعدة البيانات', errorCode: 'IMPORT_INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}

// Route dispatch
export const POST = withAdmin(async (req: NextRequest, ctx: unknown, admin: JWTPayload) => {
    try {
        const url = new URL(req.url);
        if (url.searchParams.get('action') === 'import') {
            return await importHandler(req, ctx, admin);
        }
        return await parseHandler(req, ctx, admin);
    } catch (routeErr: any) {
        console.error('[Question Parse Route Exception]:', {
            message: routeErr?.message,
            stack: routeErr?.stack,
        });
        return NextResponse.json(
            {
                success: false,
                message: routeErr?.message || 'حدث خطأ غير متوقع في معالجة طلب استيراد الأسئلة',
                errorCode: 'ROUTE_DISPATCH_EXCEPTION',
            },
            { status: 500 }
        );
    }
});
