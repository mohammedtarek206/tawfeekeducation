import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const POST = withAdmin(async (req: NextRequest, ctx: unknown, admin: JWTPayload) => {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ success: false, message: 'الرابط غير صحيح' }, { status: 400 });
        }

        // Extract Google Drive ID
        // Supports formats: https://drive.google.com/file/d/FILE_ID/view, https://docs.google.com/document/d/FILE_ID/edit
        const idMatch = url.match(/[-\w]{25,}/);
        if (!idMatch) {
            return NextResponse.json({ success: false, message: 'الرابط لا يحتوي على معرف ملف صالح' }, { status: 400 });
        }
        const fileId = idMatch[0];

        // Fetch file from Google Drive
        // Note: For this to work, the file MUST be public ("Anyone with the link").
        const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const driveRes = await fetch(driveUrl, { method: 'GET' });

        if (!driveRes.ok) {
            // It could be a Google Doc, which uses a different export URL
            const docUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
            const docRes = await fetch(docUrl, { method: 'GET' });
            if (!docRes.ok) {
                return NextResponse.json({ success: false, message: 'لا يمكن الوصول إلى الملف. تأكد أن الملف متاح للرابط (Public).' }, { status: 400 });
            }
            return await processDriveResponse(docRes, true);
        }

        return await processDriveResponse(driveRes, false);

    } catch (error: any) {
        console.error('Parse Drive error:', error);
        return NextResponse.json({ success: false, message: 'حدث خطأ أثناء قراءة الملف.' }, { status: 500 });
    }
});

async function processDriveResponse(res: Response, isGoogleDocFallback: boolean) {
    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let parsedData = null;

    try {
        if (contentType.includes('text/plain') || contentType.includes('text/csv')) {
            extractedText = buffer.toString('utf-8');
            parsedData = await parseWithGeminiText(extractedText);
        } else if (contentType.includes('application/pdf')) {
            parsedData = await parseWithGeminiFile(buffer, 'application/pdf');
        } else {
            // Assume it's a PDF if nothing else, or use Gemini 1.5 to parse docx generically if supported.
            // Generative AI API currently supports PDF natively.
            // Let's just pass it to Gemini as application/pdf and see if it can handle it (since docs export to pdf).
            // Or if it's an uploaded docx, Gemini 1.5 doesn't natively support docx inline data, but we can try letting it read text or fail.
            // Actually, we can fetch Google docs as plain text: `export?format=txt`.
            return NextResponse.json({ success: false, message: 'الملف غير مدعوم أو غير مقروء. يرجى استخدام PDF أو TXT أو Google Docs.' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Gemini error:', error);
        return NextResponse.json({ success: false, message: 'فشل في تحليل الملف عبر الذكاء الاصطناعي.' }, { status: 500 });
    }

    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        return NextResponse.json({ success: false, message: 'لم يتم استخراج أي أسئلة صالحة من الملف.' }, { status: 400 });
    }

    // Format to match frontend structure
    const preview = parsedData.map((q: any, idx: number) => ({
        index: idx,
        text: q.text,
        answer: q.answer || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        type: q.type || 'mcq',
        points: q.points || 1,
        valid: true,
        isDuplicate: false, // Could integrate duplicate check here
        rawSource: q
    }));

    return NextResponse.json({
        success: true,
        data: {
            preview,
            stats: {
                total: preview.length,
                valid: preview.length,
                invalid: 0,
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
    "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"], // في حالة كان mcq، ولا تكتب أرقام أو حروف للاختيار
    "correctAnswer": "الاختيار الصحيح بالكامل كما ورد في الاختيارات" // أو "صح" أو "خطأ" لـ true_false، أو الإجابة النموذجية
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
