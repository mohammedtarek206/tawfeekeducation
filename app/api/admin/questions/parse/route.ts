import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { parseQuestionsFromText } from '@/lib/utils/questionParser';

function detectDuplicates(
    parsed: Array<{ text: string; answer: string }>,
    existing: Array<{ text: string }>
): Set<number> {
    const dupes = new Set<number>();
    const existingNorm = existing.map((q) => q.text.trim().toLowerCase());
    const seenInBatch = new Map<string, number>();

    parsed.forEach((p, idx) => {
        const norm = p.text.trim().toLowerCase();
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

// POST /api/admin/questions/parse — parse text and return preview
async function parseHandler(req: NextRequest, _ctx: unknown, _admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
        return NextResponse.json({ success: false, message: 'النص فارغ أو قصير جداً' }, { status: 400 });
    }

    const parsed = parseQuestionsFromText(text);

    if (!parsed.length) {
        return NextResponse.json(
            { success: false, message: 'لم يتم التعرف على أي أسئلة. تأكد من الصيغة: "س: السؤال" و"ج: الإجابة"' },
            { status: 400 }
        );
    }

    // Check for duplicates against existing DB
    const existingQuestions = await Question.find({
        text: { $in: parsed.map((p) => ({ $regex: p.text.substring(0, 30), $options: 'i' })) },
    }).select('text').lean();

    const duplicateIndices = detectDuplicates(parsed, existingQuestions as Array<{ text: string }>);

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
}

// POST /api/admin/questions/import — save parsed questions to DB
async function importHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    await connectDB();
    const body = await req.json();
    const { questions, grade, subject, difficulty } = body;

    if (!questions || !Array.isArray(questions) || !questions.length) {
        return NextResponse.json({ success: false, message: 'لا توجد أسئلة للاستيراد' }, { status: 400 });
    }
    if (!grade) return NextResponse.json({ success: false, message: 'يرجى تحديد الصف' }, { status: 400 });
    if (!subject) return NextResponse.json({ success: false, message: 'يرجى تحديد المادة' }, { status: 400 });

    const toInsert = questions
        .filter((q: any) => !q.skip && q.text)
        .map((q: any) => {
            let parsedChoices = [];
            let qType = q.type || 'true_false';

            if (q.type === 'mcq' && Array.isArray(q.options) && q.options.length > 0) {
                // Determine correctAnswer
                const correctAnswer = q.correctAnswer || q.answer || '';
                parsedChoices = q.options.map((opt: string) => ({
                    text: opt.trim(),
                    isCorrect: opt.trim() === correctAnswer.trim()
                }));
                // Fallback if no correct option found
                if (!parsedChoices.some((c: any) => c.isCorrect) && parsedChoices.length > 0) {
                    parsedChoices[0].isCorrect = true;
                }
            } else if (q.type === 'true_false') {
                const isCorrect = q.correctAnswer === 'صح' || q.correctAnswer === 'True' || q.correctAnswer === 'true' || q.answer === 'صح';
                parsedChoices = [
                    { text: 'صح', isCorrect: isCorrect },
                    { text: 'خطأ', isCorrect: !isCorrect }
                ];
            } else if (q.type === 'short_answer' || q.type === 'essay') {
                parsedChoices = [
                    { text: (q.correctAnswer || q.answer).trim(), isCorrect: true }
                ];
            } else {
                // Fallback for manual (old) parser
                parsedChoices = [
                    { text: q.answer ? q.answer.trim() : 'الإجابة', isCorrect: true },
                    { text: 'إجابة خاطئة', isCorrect: false },
                ];
                qType = 'true_false';
            }

            return {
                text: q.text.trim(),
                type: qType,
                choices: parsedChoices,
                difficulty: difficulty || 'medium',
                subject,
                grade,
                isActive: true,
                usageCount: 0,
                order: 0,
                points: q.points || 1,
                tags: [],
                createdBy: admin.userId,
            };
        });

    if (!toInsert.length) {
        return NextResponse.json({ success: false, message: 'لا توجد أسئلة صالحة بعد الفلترة' }, { status: 400 });
    }

    const inserted = await Question.insertMany(toInsert);

    return NextResponse.json({
        success: true,
        message: `تم استيراد ${inserted.length} سؤال بنجاح`,
        data: { count: inserted.length },
    });
}

// Route dispatch
export const POST = withAdmin(async (req: NextRequest, ctx: unknown, admin: JWTPayload) => {
    const url = new URL(req.url);
    if (url.searchParams.get('action') === 'import') {
        return importHandler(req, ctx, admin);
    }
    return parseHandler(req, ctx, admin);
});
