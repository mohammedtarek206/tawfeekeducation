import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    parseQuestionsFromText,
    extractTextFromDocx,
    extractTextFromPdf
} from '@/lib/utils/questionParser';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export const POST = withAdmin(async (req: NextRequest, ctx: unknown, _admin: JWTPayload) => {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ success: false, message: 'رابط الملف غير صحيح' }, { status: 400 });
        }

        // Extract Google Drive / Docs ID
        const idMatch = url.match(/[-\w]{25,}/);
        if (!idMatch) {
            return NextResponse.json({ success: false, message: 'الرابط لا يحتوي على معرف ملف Google Drive صالح' }, { status: 400 });
        }
        const fileId = idMatch[0];

        // Fetch file from Google Drive with fallbacks
        let driveRes: Response | null = null;

        // Try direct txt export first if it's a Google Doc
        const txtExportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        try {
            const r = await fetch(txtExportUrl, { method: 'GET' });
            if (r.ok) driveRes = r;
        } catch { }

        // Try direct download
        if (!driveRes || !driveRes.ok) {
            const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            try {
                const r = await fetch(directDownloadUrl, { method: 'GET' });
                if (r.ok) driveRes = r;
            } catch { }
        }

        // Try PDF export if it's a Google Doc/Sheet
        if (!driveRes || !driveRes.ok) {
            const pdfExportUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
            try {
                const r = await fetch(pdfExportUrl, { method: 'GET' });
                if (r.ok) driveRes = r;
            } catch { }
        }

        if (!driveRes || !driveRes.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'تعذر الوصول إلى الملف على Google Drive. يرجى التأكد من ضبط إعدادات المشاركة للملف على "أي شخص لديه الرابط" (Anyone with the link).',
                },
                { status: 400 }
            );
        }

        return await processDriveResponse(driveRes);

    } catch (error: any) {
        console.error('Parse Drive error:', error);
        return NextResponse.json({ success: false, message: error.message || 'حدث خطأ أثناء قراءة الملف من Google Drive' }, { status: 500 });
    }
});

async function processDriveResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let parsedData: any[] = [];

    try {
        if (contentType.includes('text/plain') || contentType.includes('text/csv')) {
            extractedText = buffer.toString('utf-8');
            parsedData = parseQuestionsFromText(extractedText);
        } else if (contentType.includes('application/pdf')) {
            // First try local PDF text extraction
            try {
                extractedText = await extractTextFromPdf(buffer);
                parsedData = parseQuestionsFromText(extractedText);
            } catch (pdfErr) {
                console.warn('Local PDF parse failed, trying Gemini if available:', pdfErr);
                if (genAI) {
                    parsedData = await parseWithGeminiFile(buffer, 'application/pdf');
                } else {
                    return NextResponse.json({
                        success: false,
                        message: 'فشل في استخراج نصوص مقروءة من ملف PDF (قد يكون ممسوحاً ضوئياً كصور). يرجى استخدام ملف نصي TXT أو مستند Google Docs.',
                    }, { status: 400 });
                }
            }
        } else if (contentType.includes('application/vnd.openxmlformats') || contentType.includes('application/msword')) {
            extractedText = await extractTextFromDocx(buffer);
            parsedData = parseQuestionsFromText(extractedText);
        } else {
            // Generic fallback
            extractedText = buffer.toString('utf-8');
            parsedData = parseQuestionsFromText(extractedText);
        }
    } catch (error: any) {
        console.error('Drive parse error:', error);
        return NextResponse.json({ success: false, message: error.message || 'حدث خطأ أثناء تحليل محتوى الملف.' }, { status: 500 });
    }

    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        return NextResponse.json({
            success: false,
            message: 'لم يتم استخراج أي أسئلة صالحة من الملف. تأكد من احتواء الملف على أسئلة بالصيغة المعتمدة (س: السؤال، الاختيارات، الإجابة).',
        }, { status: 400 });
    }

    // Format to match frontend structure
    const preview = parsedData.map((q: any, idx: number) => ({
        index: idx,
        text: q.text,
        answer: q.answer || q.correctAnswer || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || q.answer || '',
        correctIndex: q.correctIndex,
        type: q.type || (q.options?.length > 1 ? 'mcq' : 'essay'),
        points: q.points || 1,
        explanation: q.explanation || '',
        modelAnswer: q.modelAnswer || '',
        gradingCriteria: q.gradingCriteria || '',
        valid: Boolean(q.valid !== undefined ? q.valid : (q.text && (q.type === 'essay' || q.correctAnswer || q.options?.length))),
        error: q.error,
        isDuplicate: false,
    }));

    return NextResponse.json({
        success: true,
        data: {
            preview,
            stats: {
                total: preview.length,
                valid: preview.filter((p) => p.valid).length,
                invalid: preview.filter((p) => !p.valid).length,
                duplicates: 0,
            }
        }
    });
}

const GEMINI_SYSTEM_PROMPT = `
استخرج الأسئلة من هذا الملف الذي يحتوي على أسئلة امتحانات أو تدريبات. 
يجب إرجاع النتيجة بصيغة JSON array فقط، حيث يكون كل عنصر عبارة عن:
{
    "text": "نص السؤال",
    "type": "mcq" | "true_false" | "essay",
    "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
    "correctAnswer": "الاختيار الصحيح بالكامل كما ورد في الاختيارات",
    "points": 1,
    "explanation": "شرح الإجابة إن وجد",
    "modelAnswer": "الإجابة النموذجية للأسئلة المقالية"
}
إذا لم يكن هناك اختيارات وكان السؤال يتطلب إجابة مكتوبة، ضع type كـ essay.
يجب ألا تقوم بإرجاع أي شيء آخر سوى المصفوفة كـ JSON صالح (بدون Markdown fences).
`;

async function parseWithGeminiFile(buffer: Buffer, mimeType: string) {
    if (!genAI) throw new Error('GEMINI_API_KEY is missing');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });

    const result = await model.generateContent([
        { text: GEMINI_SYSTEM_PROMPT },
        { inlineData: { data: buffer.toString('base64'), mimeType } }
    ]);

    const responseText = result.response.text();
    return JSON.parse(responseText);
}
