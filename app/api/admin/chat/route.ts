import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';

// POST /api/admin/chat - Admin chatbot endpoint
async function postHandler(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();
        const { message } = body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ success: false, message: 'الرسالة مطلوبة' }, { status: 400 });
        }

        const systemPrompt = `أنت مساعد ذكاء اصطناعي لأدمن منصة "التوفيق" التعليمية. تساعده في:
- تحليل بيانات الطلاب وأسئلتهم الإدارية
- صياغة محتوى تعليمي وأسئلة امتحانية
- الإجابة على استفساراته المتعلقة بإدارة المنصة
أجب باللغة العربية بشكل دقيق ومهني.`;

        // Try Google Gemini (Primary: flash-latest, Fallback: gemini-pro)
        let geminiErrorDetails = '';
        if (process.env.GEMINI_API_KEY) {
            const makeRequest = async (modelName: string) => {
                return fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': (process.env.GEMINI_API_KEY as string).trim() },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `${systemPrompt}\n\nسؤال الأدمن: ${message.trim()}` }] }],
                            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
                        }),
                    }
                );
            };

            let geminiRes = await makeRequest('gemini-flash-latest');

            // Fallback for 503 High Demand
            if (geminiRes.status === 503) {
                geminiRes = await makeRequest('gemini-pro');
            }

            if (geminiRes.ok) {
                const data = await geminiRes.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply) return NextResponse.json({ success: true, reply });
            } else {
                if (geminiRes.status === 503) {
                    geminiErrorDetails = "السيرفرات العالمية تواجه ضغطاً كبيراً. حاول بعد ثوانٍ.";
                } else {
                    geminiErrorDetails = "خدمة الذكاء الاصطناعي لا تستجيب حالياً.";
                }
            }
        }

        // Fallback: OpenAI
        if (process.env.OPENAI_API_KEY) {
            const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message.trim() },
                    ],
                    max_tokens: 2048,
                }),
            });
            if (openaiRes.ok) {
                const data = await openaiRes.json();
                const reply = data?.choices?.[0]?.message?.content;
                if (reply) return NextResponse.json({ success: true, reply });
            }
        }

        if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, message: 'يجب إضافة OPENAI_API_KEY أو GEMINI_API_KEY في ملف .env.local لتفعيل الشات بوت.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { success: false, message: geminiErrorDetails || 'تعذر الحصول على رد. تأكد من اتصالك بالإنترنت.' },
            { status: 500 }
        );
    } catch (err) {
        console.error('Admin chat error:', err);
        return NextResponse.json({ success: false, message: 'حدث خطأ داخلي' }, { status: 500 });
    }
}

export const POST = withAdmin(postHandler);
