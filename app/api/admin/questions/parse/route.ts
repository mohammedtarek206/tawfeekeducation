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
function parseQuestionsFromText(raw: string): Array<{
    text: string;
    answer: string;
    valid: boolean;
    error?: string;
}> {
    const results: Array<{ text: string; answer: string; valid: boolean; error?: string }> = [];

    // Normalize
    const text = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .trim();

    const lines = text.split('\n');

    // Try structured pattern parsing (س:/ج:, Q:/A:, Question:/Answer:)
    const questionPrefixes = /^(?:س\s*[:：\-–]?\s*\d*\s*[:：\-–]?\s*|سؤال\s*[:：\-–]?\s*|Q\s*[:：\-–]\s*|Question\s*[:：\-–]\s*)/i;
    const answerPrefixes = /^(?:ج\s*[:：\-–]?\s*\d*\s*[:：\-–]?\s*|جواب\s*[:：\-–]?\s*|إجابة\s*[:：\-–]?\s*|A\s*[:：\-–]\s*|Answer\s*[:：\-–]\s*|الإجابة\s*[:：\-–]?\s*)/i;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();

        if (!line) { i++; continue; }

        // Detect question line
        if (questionPrefixes.test(line)) {
            const questionText = line.replace(questionPrefixes, '').trim();

            // Collect continuation lines (not starting with answer prefix)
            let j = i + 1;
            const questionLines = [questionText];
            while (j < lines.length && lines[j].trim() && !answerPrefixes.test(lines[j].trim()) && !questionPrefixes.test(lines[j].trim())) {
                questionLines.push(lines[j].trim());
                j++;
            }

            // Skip empty lines between Q and A
            while (j < lines.length && !lines[j].trim()) j++;

            // Look for answer
            if (j < lines.length && answerPrefixes.test(lines[j].trim())) {
                const answerText = lines[j].replace(answerPrefixes, '').trim();
                const answerLines = [answerText];
                j++;
                while (j < lines.length && lines[j].trim() && !questionPrefixes.test(lines[j].trim()) && !answerPrefixes.test(lines[j].trim())) {
                    answerLines.push(lines[j].trim());
                    j++;
                }
                const finalQ = questionLines.join(' ').trim();
                const finalA = answerLines.join(' ').trim();
                if (finalQ && finalA) {
                    results.push({ text: finalQ, answer: finalA, valid: true });
                } else {
                    results.push({ text: finalQ || '(فارغ)', answer: '', valid: false, error: 'الإجابة فارغة' });
                }
            } else {
                const finalQ = questionLines.join(' ').trim();
                results.push({ text: finalQ, answer: '', valid: false, error: 'لم يتم العثور على إجابة' });
            }
            i = j;
        } else {
            i++;
        }
    }

    // If nothing parsed, try block parsing (every 2 non-empty lines = Q+A)
    if (results.length === 0) {
        const nonEmpty = lines.filter((l) => l.trim());
        for (let k = 0; k + 1 < nonEmpty.length; k += 2) {
            const q = nonEmpty[k].trim();
            const a = nonEmpty[k + 1].trim();
            if (q && a) {
                results.push({ text: q, answer: a, valid: true });
            }
        }
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
        .filter((q: { text: string; answer: string; skip?: boolean }) => !q.skip && q.text && q.answer)
        .map((q: { text: string; answer: string }) => ({
            text: q.text.trim(),
            type: 'true_false' as const,
            choices: [
                { text: q.answer.trim(), isCorrect: true },
                { text: 'إجابة خاطئة', isCorrect: false },
            ],
            difficulty: difficulty || 'medium',
            subject,
            grade,
            isActive: true,
            usageCount: 0,
            order: 0,
            points: 1,
            tags: [],
            createdBy: admin.userId,
        }));

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
