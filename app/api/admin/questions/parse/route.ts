import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Question from '@/lib/db/models/Question';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

/**
 * Smart Question Parser
 * Supports formats:
 *   س: السؤال / ج: الإجابة
 *   Question: ... / Answer: ...
 *   Q: ... / A: ...
 *   س١ - السؤال / ج - الإجابة
 *   السؤال بدون prefix / الإجابة تحته مباشرة
 */
interface ParsedItem {
    text: string;
    answer: string;
    options: string[];
    correctAnswer: string;
    type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
    valid: boolean;
    error?: string;
}

function parseQuestionsFromText(raw: string): ParsedItem[] {
    const results: ParsedItem[] = [];

    // Normalize newlines
    const normalized = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .trim();

    // Split blocks by double newline or numbered questions (e.g. 1. 2. or س1:)
    const blocks = normalized.split(/\n\s*\n+/);

    const qPrefixRegex = /^(?:س\s*[:：\-–]?\s*\d*|سؤال\s*\d*|Q\s*[:：\-–]?\s*\d*|Question\s*\d*|\d+[\.\-\)])\s*[:：\-–]?\s*/i;
    const aPrefixRegex = /^(?:ج\s*[:：\-–]?|جواب|إجابة|A\s*[:：\-–]?|Answer|الإجابة)\s*[:：\-–]?\s*/i;
    const choicePrefixRegex = /^(?:[أبجدA-Da-d1-4][\.\-\)]|\-|\*)\s*/;

    for (const block of blocks) {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;

        let questionText = '';
        let answerText = '';
        const options: string[] = [];

        // Find question line
        const firstLine = lines[0];
        questionText = firstLine.replace(qPrefixRegex, '').trim();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (aPrefixRegex.test(line)) {
                answerText = line.replace(aPrefixRegex, '').trim();
            } else if (choicePrefixRegex.test(line)) {
                options.push(line.replace(choicePrefixRegex, '').trim());
            } else if (!answerText) {
                // Could be option line or continuation of question
                if (options.length > 0) {
                    options.push(line);
                } else {
                    questionText += ' ' + line;
                }
            }
        }

        if (!questionText) continue;

        // Determine question type & validity
        let qType: 'mcq' | 'true_false' | 'short_answer' | 'essay' = 'short_answer';
        let isValid = true;
        let errMsg: string | undefined;

        if (options.length > 1) {
            qType = 'mcq';
            if (!answerText && options.length > 0) {
                // Check if answer is indicated in one of the options or default first
                answerText = options[0];
            }
        } else if (answerText === 'صح' || answerText === 'خطأ' || answerText.toLowerCase() === 'true' || answerText.toLowerCase() === 'false') {
            qType = 'true_false';
            if (answerText.toLowerCase() === 'true') answerText = 'صح';
            if (answerText.toLowerCase() === 'false') answerText = 'خطأ';
        } else {
            qType = 'short_answer';
        }

        if (!answerText && (qType as string) !== 'essay') {
            isValid = false;
            errMsg = 'الإجابة مفقودة';
        } else if (qType === 'mcq' && options.length < 2) {
            isValid = false;
            errMsg = 'خيارات MCQ غير كافية';
        }

        results.push({
            text: questionText,
            answer: answerText,
            options,
            correctAnswer: answerText,
            type: qType,
            valid: isValid,
            error: errMsg,
        });
    }

    return results;
}

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
