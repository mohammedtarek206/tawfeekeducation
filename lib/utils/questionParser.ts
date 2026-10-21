import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface ParsedItem {
    text: string;
    answer: string;
    options: string[];
    correctAnswer: string;
    correctIndex?: number;
    type: 'mcq' | 'true_false' | 'essay';
    points: number;
    explanation?: string;
    modelAnswer?: string;
    gradingCriteria?: string;
    valid: boolean;
    error?: string;
}

/**
 * Extracts raw text from a DOCX buffer using mammoth
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
    } catch (err: any) {
        throw new Error(`فشل استخراج النص من ملف DOCX: ${err.message || err}`);
    }
}

/**
 * Extracts raw text from a text-based PDF buffer using pdf-parse
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        await parser.destroy().catch(() => {});
        const text = data.text || '';
        if (!text.trim()) {
            throw new Error('لم يتم العثور على نصوص قابلة للقراءة داخل ملف PDF (قد يكون ملفاً ممسوحاً ضوئياً يتطلب OCR)');
        }
        return text;
    } catch (err: any) {
        throw new Error(`فشل قراءة ملف PDF: ${err.message || err}`);
    }
}

/**
 * Letter to index mapping for Arabic & English choices
 */
const LABEL_INDEX_MAP: Record<string, number> = {
    'أ': 0, 'ا': 0, 'إ': 0, 'آ': 0, 'a': 0, 'A': 0, '1': 0, '١': 0,
    'ب': 1, 'b': 1, 'B': 1, '2': 1, '٢': 1,
    'ج': 2, 'c': 2, 'C': 2, '3': 2, '٣': 2,
    'د': 3, 'd': 3, 'D': 3, '4': 3, '٤': 3,
    'هـ': 4, 'ه': 4, 'e': 4, 'E': 4, '5': 4, '٥': 4,
    'و': 5, 'f': 5, 'F': 5, '6': 5, '٦': 5,
};

/**
 * Parses questions from formatted Arabic/English plain text
 */
export function parseQuestionsFromText(raw: string): ParsedItem[] {
    const results: ParsedItem[] = [];

    // Normalize input
    const normalized = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .trim();

    if (!normalized) return results;

    const rawBlocks = normalized.split(/\n\s*\n+/);
    const finalBlocks: string[] = [];

    for (const b of rawBlocks) {
        const trimmed = b.trim();
        if (!trimmed) continue;
        const subBlocks = trimmed.split(/\n(?=(?:س\s*[:：\-–]\s*\d*|سؤال\s*\d*[:：\-–]?|Q\s*[:：\-–]\s*\d*|Question\s*\d*[:：\-–]?|\d+[\.\-\)]\s+))/i);
        for (const sb of subBlocks) {
            const sbt = sb.trim();
            if (sbt) finalBlocks.push(sbt);
        }
    }

    const qTypeRegex = /^(?:نوع\s*السؤال|النوع|نوع)\s*[:：\-–]?\s*(.*)$/i;
    const qPrefixRegex = /^(?:س\s*[:：\-–]\s*\d*|سؤال\s*\d*[:：\-–]?|Q\s*[:：\-–]\s*\d*|Question\s*\d*[:：\-–]?|\d+[\.\-\)]\s*)\s*/i;
    const choicePrefixRegex = /^(?:[\(\[]?([أإآابتثجحخدذرزسشصضطظعغفقكلمنهويa-zA-Z0-9١-٩])[\)\]\.\-]|[\-\*•])\s+/;
    const aPrefixRegex = /^(?:(?:الإجابة\s*الصحيحة|الاجابة\s*الصحيحة|الإجابة|الاجابة|إجابة|اجابة|الجواب|جواب(?:\s+هو|\s+هي)?|Answer)\s*[:：\-–=]?|(?:ج|A)\s*[:：\-–=])\s*(.*)$/i;
    const pointsRegex = /^(?:الدرجة|درجة|النقاط|نقاط|درجات|Points?|Score)\s*[:：\-–]?\s*(\d+(?:\.\d+)?)/i;
    const explanationRegex = /^(?:الشرح|شرح|التفسير|تفسير|توضيح|Explanation)\s*[:：\-–]?\s*(.*)$/i;
    const modelAnswerRegex = /^(?:الإجابة\s*النموذجية|الاجابة\s*النموذجية|إجابة\s*نموذجية|اجابة\s*نموذجية|Model\s*Answer)\s*[:：\-–]?\s*(.*)$/i;
    const rubricRegex = /^(?:معايير\s*التصحيح|معيار\s*التصحيح|معايير|Rubric|Grading\s*Criteria)\s*[:：\-–]?\s*(.*)$/i;

    for (const block of finalBlocks) {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;

        let declaredType: 'mcq' | 'true_false' | 'essay' | null = null;
        let questionText = '';
        let rawAnswer = '';
        const options: string[] = [];
        let points = 1;
        let explanation = '';
        let modelAnswer = '';
        let gradingCriteria = '';

        for (const line of lines) {
            // Check type declaration
            const typeMatch = line.match(qTypeRegex);
            if (typeMatch) {
                const tVal = typeMatch[1].trim().toLowerCase();
                if (tVal.includes('مقال') || tVal.includes('essay')) declaredType = 'essay';
                else if (tVal.includes('صح') || tVal.includes('true') || tVal.includes('خطأ')) declaredType = 'true_false';
                else if (tVal.includes('اختيار') || tVal.includes('mcq')) declaredType = 'mcq';
                continue;
            }

            // Check question prefix FIRST
            if (!questionText && qPrefixRegex.test(line)) {
                questionText = line.replace(qPrefixRegex, '').trim();
                continue;
            }

            const ptsMatch = line.match(pointsRegex);
            if (ptsMatch) {
                const parsedPts = parseFloat(ptsMatch[1]);
                if (!isNaN(parsedPts) && parsedPts > 0) points = parsedPts;
                continue;
            }

            const expMatch = line.match(explanationRegex);
            if (expMatch) {
                explanation = expMatch[1].trim();
                continue;
            }

            const modelMatch = line.match(modelAnswerRegex);
            if (modelMatch) {
                modelAnswer = modelMatch[1].trim();
                declaredType = 'essay';
                continue;
            }

            const rubricMatch = line.match(rubricRegex);
            if (rubricMatch) {
                gradingCriteria = rubricMatch[1].trim();
                declaredType = 'essay';
                continue;
            }

            const ansMatch = line.match(aPrefixRegex);
            if (ansMatch) {
                rawAnswer = ansMatch[1].trim();
                continue;
            }

            if (declaredType !== 'essay') {
                const choiceMatch = line.match(choicePrefixRegex);
                if (choiceMatch) {
                    const cleanedOpt = line.replace(choicePrefixRegex, '').trim();
                    if (cleanedOpt) options.push(cleanedOpt);
                    continue;
                }
            }

            if (!questionText) {
                questionText = line.replace(qPrefixRegex, '').trim();
                if (!questionText) questionText = line.trim();
            } else if (!rawAnswer && !options.length && !modelAnswer) {
                questionText += ' ' + line.trim();
            } else if (explanation && !modelAnswer) {
                explanation += ' ' + line.trim();
            }
        }

        if (!questionText || questionText.length < 2) continue;

        let finalType: 'mcq' | 'true_false' | 'essay' = 'mcq';
        let isValid = true;
        let errMsg: string | undefined;
        let finalCorrectAnswer = '';
        let finalCorrectIndex: number | undefined = undefined;

        const normAns = rawAnswer.trim().toLowerCase();

        if (declaredType === 'essay' || (!options.length && (modelAnswer || gradingCriteria || normAns.length > 50))) {
            finalType = 'essay';
            finalCorrectAnswer = modelAnswer || rawAnswer;
            if (!modelAnswer && rawAnswer) modelAnswer = rawAnswer;
            isValid = questionText.length >= 3;
            if (!isValid) errMsg = 'نص السؤال قصير جداً';
        } else if (
            declaredType === 'true_false' ||
            (options.length === 0 && (
                normAns === 'صح' || normAns === 'خطأ' ||
                normAns === 'صحيح' || normAns === 'خاطئ' ||
                normAns === 'true' || normAns === 'false'
            )) ||
            (options.length === 2 && (
                (options[0].includes('صح') && options[1].includes('خطأ')) ||
                (options[0].includes('خطأ') && options[1].includes('صح'))
            ))
        ) {
            finalType = 'true_false';
            options.length = 0;
            options.push('صح', 'خطأ');
            if (normAns === 'صح' || normAns === 'صحيح' || normAns === 'true' || normAns === 'أ' || normAns === 'a') {
                finalCorrectAnswer = 'صح';
                finalCorrectIndex = 0;
            } else if (normAns === 'خطأ' || normAns === 'خاطئ' || normAns === 'false' || normAns === 'ب' || normAns === 'b') {
                finalCorrectAnswer = 'خطأ';
                finalCorrectIndex = 1;
            } else {
                isValid = false;
                errMsg = 'لم يتم تحديد إجابة صحيحة لسؤال صح/خطأ (يجب أن تكون صح أو خطأ)';
            }
        } else {
            finalType = 'mcq';
            if (options.length < 2) {
                isValid = false;
                errMsg = 'يجب توفر خيارين على الأقل لسؤال الاختيار من متعدد';
            } else {
                const cleanAnsKey = rawAnswer.replace(/^[\(\[\{]/, '').replace(/[\)\]\}]$/, '').trim();
                if (cleanAnsKey && LABEL_INDEX_MAP[cleanAnsKey] !== undefined) {
                    const mappedIdx = LABEL_INDEX_MAP[cleanAnsKey];
                    if (mappedIdx < options.length) {
                        finalCorrectIndex = mappedIdx;
                        finalCorrectAnswer = options[mappedIdx];
                    }
                }

                if (finalCorrectIndex === undefined && rawAnswer) {
                    const normRaw = rawAnswer.trim().toLowerCase();
                    const exactIdx = options.findIndex((opt) => opt.trim().toLowerCase() === normRaw);
                    if (exactIdx !== -1) {
                        finalCorrectIndex = exactIdx;
                        finalCorrectAnswer = options[exactIdx];
                    } else {
                        const partialIdx = options.findIndex(
                            (opt) => opt.trim().toLowerCase().includes(normRaw) || normRaw.includes(opt.trim().toLowerCase())
                        );
                        if (partialIdx !== -1) {
                            finalCorrectIndex = partialIdx;
                            finalCorrectAnswer = options[partialIdx];
                        }
                    }
                }

                if (finalCorrectIndex === undefined) {
                    isValid = false;
                    errMsg = rawAnswer
                        ? `الإجابة المحددة ("${rawAnswer}") لا تطابق أيًا من الاختيارات المتاحة`
                        : 'لم يتم تحديد الإجابة الصحيحة من بين الخيارات';
                }
            }
        }

        results.push({
            text: questionText,
            answer: rawAnswer || finalCorrectAnswer,
            options,
            correctAnswer: finalCorrectAnswer,
            correctIndex: finalCorrectIndex,
            type: finalType,
            points,
            explanation: explanation || undefined,
            modelAnswer: modelAnswer || undefined,
            gradingCriteria: gradingCriteria || undefined,
            valid: isValid,
            error: errMsg,
        });
    }

    return results;
}
