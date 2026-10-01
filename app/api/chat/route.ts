import { NextRequest, NextResponse } from 'next/server';
import { withStudent } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';

// POST /api/chat - Student chatbot endpoint
async function postHandler(req: NextRequest, _ctx: unknown, student: JWTPayload): Promise<NextResponse> {
    try {
        const body = await req.json();
        const { message } = body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ success: false, message: 'الرسالة مطلوبة' }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, message: 'خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى التواصل مع الإدارة.' },
                { status: 503 }
            );
        }

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
                            contents: [{ parts: [{ text: `أنت مساعد تعليمي في منصة التوفيق للمرحلة الثانوية. أجب على أسئلة الطالب بطريقة واضحة وبسيطة باللغة العربية.\n\nسؤال الطالب: ${message.trim()}` }] }],
                            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
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
                if (reply) {
                    return NextResponse.json({ success: true, reply });
                }
            } else {
                if (geminiRes.status === 503) {
                    geminiErrorDetails = "السيرفرات العالمية تواجه ضغطاً كبيراً. حاول بعد ثوانٍ.";
                } else {
                    geminiErrorDetails = "خدمة المساعد الذكي لا تستجيب حالياً.";
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
                        {
                            role: 'system',
                            content: 'أنت مساعد تعليمي في منصة التوفيق للمرحلة الثانوية. أجب على أسئلة الطالب بطريقة واضحة وبسيطة باللغة العربية.',
                        },
                        { role: 'user', content: message.trim() },
                    ],
                    max_tokens: 1024,
                    temperature: 0.7,
                }),
            });

            if (openaiRes.ok) {
                const data = await openaiRes.json();
                const reply = data?.choices?.[0]?.message?.content;
                if (reply) {
                    return NextResponse.json({ success: true, reply });
                }
            }
        }

        return NextResponse.json(
            { success: false, message: geminiErrorDetails || 'تعذر الحصول على رد. تأكد من اتصالك بالإنترنت.' },
            { status: 500 }
        );
    } catch (err) {
        console.error('Chat error:', err);
        return NextResponse.json({ success: false, message: 'حدث خطأ، حاول مرة أخرى.' }, { status: 500 });
    }
}

export const POST = withStudent(postHandler);
