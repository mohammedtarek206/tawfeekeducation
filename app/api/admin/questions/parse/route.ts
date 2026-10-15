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
    try {
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
        let existingQuestions: Array<{ text: string }> = [];
        try {
            const textQueries = parsed.map((p) => p.text.substring(0, 30));
            existingQuestions = await Question.find({
                text: { $regex: textQueries.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), $options: 'i' },
            }).select('text').lean() as Array<{ text: string }>;
        } catch {
            // If duplicate detection fails, continue without it
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
    } catch (err) {
        console.error('Parse error:', err);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ أثناء تحليل النص' },
            { status: 500 }
        );
    }
}

// POST /api/admin/questions/import — save parsed questions to DB
async function importHandler(req: NextRequest, _ctx: unknown, admin: JWTPayload): Promise<NextResponse> {
    try {
        await connectDB();
        const body = await req.json();
        const { questions, grade, subject, difficulty } = body;

        if (!questions || !Array.isArray(questions) || !questions.length) {
            return NextResponse.json({ success: false, message: 'لا توجد أسئلة للاستيراد' }, { status: 400 });
        }
        if (!grade) return NextResponse.json({ success: false, message: 'يرجى تحديد الصف' }, { status: 400 });
        if (!subject) return NextResponse.json({ success: false, message: 'يرجى تحديد المادة' }, { status: 400 });

        const toInsert = questions
            .filter((q: any) => !q.skip && q.text && q.text.trim())
            .map((q: any) => {
                let parsedChoices = [];
                // Force type to be only 'mcq' or 'true_false' (the only types the Question model accepts)
                let qType: 'mcq' | 'true_false' = 'true_false';

                if (q.type === 'mcq' && Array.isArray(q.options) && q.options.length >= 2) {
                    qType = 'mcq';
                    const correctAnswer = (q.correctAnswer || q.answer || '').trim();
                    parsedChoices = q.options.map((opt: string) => ({
                        text: typeof opt === 'string' ? opt.trim() : String(opt),
                        isCorrect: typeof opt === 'string' && opt.trim() === correctAnswer
                    }));
                    // If no correct answer matched, mark the first as correct
                    if (!parsedChoices.some((c: any) => c.isCorrect) && parsedChoices.length > 0) {
                        parsedChoices[0].isCorrect = true;
                    }
                } else {
                    // Default: true_false for everything else
                    qType = 'true_false';
                    const answer = (q.correctAnswer || q.answer || '').trim();
                    const isCorrect = answer === 'صح' || answer.toLowerCase() === 'true' || answer === 'صحيح';
                    parsedChoices = [
                        { text: 'صح', isCorrect: isCorrect },
                        { text: 'خطأ', isCorrect: !isCorrect }
                    ];
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
    } catch (err) {
        console.error('Import error:', err);
        return NextResponse.json(
            { success: false, message: 'حدث خطأ أثناء حفظ الأسئلة في قاعدة البيانات' },
            { status: 500 }
        );
    }
}

// Route dispatch
export const POST = withAdmin(async (req: NextRequest, ctx: unknown, admin: JWTPayload) => {
    const url = new URL(req.url);
    if (url.searchParams.get('action') === 'import') {
        return importHandler(req, ctx, admin);
    }
    return parseHandler(req, ctx, admin);
});
