import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseQuestionsFromText } from '@/lib/utils/questionParser';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const POST = withAdmin(async (req: NextRequest, ctx: unknown, admin: JWTPayload) => {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ success: false, message: 'الرابط غير صحيح' }, { status: 400 });
        }

        // Extract Google Drive ID
        const idMatch = url.match(/[-\w]{25,}/);
        if (!idMatch) {
            return NextResponse.json({ success: false, message: 'الرابط لا يحتوي على معرف ملف صالح' }, { status: 400 });
        }
        const fileId = idMatch[0];

        // Fetch file from Google Drive
        const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        let driveRes = await fetch(driveUrl, { method: 'GET' });

        if (!driveRes.ok) {
            const docUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
            driveRes = await fetch(docUrl, { method: 'GET' });
            if (!driveRes.ok) {
                const txtUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
                driveRes = await fetch(txtUrl, { method: 'GET' });
            }
        }

        if (!driveRes.ok) {
            return NextResponse.json({ success: false, message: 'لا يمكن الوصول إلى الملف. تأكد أن الملف متاح للرابط (Public).' }, { status: 400 });
        }

        return await processDriveResponse(driveRes);

    } catch (error: any) {
        console.error('Parse Drive error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء قراءة الملف.' }, { status: 500 });
    }
});

async function processDriveResponse(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let parsedData: any = null;

    try {
        if (contentType.includes('text/plain') || contentType.includes('text/csv')) {
            extractedText = buffer.toString('utf-8');
            try {
                parsedData = await parseWithGeminiText(extractedText);
            } catch (err) {
                console.warn('Gemini text parse failed, falling back to local parser:', err);
                parsedData = parseQuestionsFromText(extractedText);
            }
        } else if (contentType.includes('application/pdf')) {
            try {
                parsedData = await parseWithGeminiFile(buffer, 'application/pdf');
            } catch (err) {
                console.warn('Gemini PDF parse failed:', err);
                return NextResponse.json({ success: false, message: 'فشل في تحليل ملف PDF عبر الذكاء الاصطناعي. تأكد من إعداد GEMINI_API_KEY أو جرب ملف نصي TXT.' }, { status: 400 });
            }
        } else {
            extractedText = buffer.toString('utf-8');
            const localResults = parseQuestionsFromText(extractedText);
            if (localResults.length > 0) {
                parsedData = localResults;
            } else {
                return NextResponse.json({ success: false, message: 'الملف غير مدعوم أو غير مقروء. يرجى استخدام PDF أو TXT أو Google Docs.' }, { status: 400 });
            }
        }
    } catch (error: any) {
        console.error('Drive parse error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء تحليل الملف.' }, { status: 500 });
    }

    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        return NextResponse.json({ success: false, message: 'لم يتم استخراج أي أسئلة صالحة من الملف.' }, { status: 400 });
    }

    // Format to match frontend structure
    const preview = parsedData.map((q: any, idx: number) => ({
        index: idx,
        text: q.text,
        answer: q.answer || q.correctAnswer || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || q.answer || '',
        type: q.type || (q.options?.length > 1 ? 'mcq' : 'short_answer'),
        points: q.points || 1,
        valid: Boolean(q.text && (q.answer || q.correctAnswer || q.options?.length)),
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
    "type": "mcq" | "true_false" | "short_answer" | "essay",
    "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
    "correctAnswer": "الاختيار الصحيح بالكامل كما ورد في الاختيارات"
}
إذا لم يكن هناك اختيارات، ضع type كـ short_answer.
يجب ألا تقوم بإرجاع أي شيء آخر سوى المصفوفة كـ JSON صالح (بدون Markdown fences).
`;

async function parseWithGeminiText(text: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });

    const result = await model.generateContent([
        { text: GEMINI_SYSTEM_PROMPT },
        { text: "النص:\n" + text }
    ]);

    const responseText = result.response.text();
    return JSON.parse(responseText);
}

async function parseWithGeminiFile(buffer: Buffer, mimeType: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });

    const result = await model.generateContent([
        { text: GEMINI_SYSTEM_PROMPT },
        { inlineData: { data: buffer.toString('base64'), mimeType } }
    ]);

    const responseText = result.response.text();
    return JSON.parse(responseText);
}
