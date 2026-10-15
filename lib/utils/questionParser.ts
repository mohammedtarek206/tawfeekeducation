export interface ParsedItem {
    text: string;
    answer: string;
    options: string[];
    correctAnswer: string;
    type: 'mcq' | 'true_false';
    valid: boolean;
    error?: string;
}

export function parseQuestionsFromText(raw: string): ParsedItem[] {
    const results: ParsedItem[] = [];

    // Normalize newlines
    const normalized = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .trim();

    if (!normalized) return results;

    // Split blocks by double newline or numbered questions
    const blocks = normalized.split(/\n\s*\n+/);

    const qPrefixRegex = /^(?:س\s*[:：\-–]?\s*\d*|سؤال\s*\d*|Q\s*[:：\-–]?\s*\d*|Question\s*\d*|\d+[\.\-\)])?\s*[:：\-–]?\s*/i;
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

        // If the first line didn't produce meaningful text, use it as-is
        if (!questionText) {
            questionText = firstLine.trim();
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (aPrefixRegex.test(line)) {
                answerText = line.replace(aPrefixRegex, '').trim();
            } else if (choicePrefixRegex.test(line)) {
                options.push(line.replace(choicePrefixRegex, '').trim());
            } else if (!answerText) {
                if (options.length > 0) {
                    options.push(line);
                } else {
                    questionText += ' ' + line;
                }
            }
        }

        if (!questionText || questionText.length < 2) continue;

        // Determine question type & validity
        // Only support 'mcq' and 'true_false' since those are the only types in the Question model
        let qType: 'mcq' | 'true_false' = 'true_false';
        let isValid = true;
        let errMsg: string | undefined;

        if (options.length >= 2) {
            qType = 'mcq';
            if (!answerText && options.length > 0) {
                answerText = options[0];
            }
        } else if (
            answerText === 'صح' || answerText === 'خطأ' ||
            answerText === 'صحيح' || answerText === 'خاطئ' ||
            answerText.toLowerCase() === 'true' || answerText.toLowerCase() === 'false'
        ) {
            qType = 'true_false';
            if (answerText.toLowerCase() === 'true' || answerText === 'صحيح') answerText = 'صح';
            if (answerText.toLowerCase() === 'false' || answerText === 'خاطئ') answerText = 'خطأ';
        } else {
            // Default to true_false for any other answer
            qType = 'true_false';
        }

        if (!answerText) {
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
