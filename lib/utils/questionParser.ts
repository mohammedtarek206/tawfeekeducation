export interface ParsedItem {
    text: string;
    answer: string;
    options: string[];
    correctAnswer: string;
    type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
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

    // Split blocks by double newline or numbered questions
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
