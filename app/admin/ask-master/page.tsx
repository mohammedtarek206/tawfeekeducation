'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatbotAdminPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;
        const newMessages: Message[] = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
            } else {
                setError(data.message || 'حدث خطأ');
            }
        } catch {
            setError('حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">مساعد الأدمن الذكي</h1>
                <p className="text-gray-500 mt-1">
                    اسأل عن إعداد المحتوى وتحليل البيانات وإدارة المنصة.
                    {!process.env.NEXT_PUBLIC_AI_CONFIGURED && (
                        <span className="mr-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                            تأكد من إضافة GEMINI_API_KEY أو OPENAI_API_KEY في .env.local
                        </span>
                    )}
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden" style={{ minHeight: '550px' }}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tawfeek-primary/10 flex items-center justify-center text-xl">🤖</div>
                    <div>
                        <div className="font-bold text-gray-900">مساعد منصة التوفيق</div>
                        <div className="text-xs text-green-500 font-medium">وضع الأدمن</div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: '400px' }}>
                    {messages.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">💬</div>
                            <p className="font-medium">كيف يمكنني مساعدتك اليوم؟</p>
                            <p className="text-sm mt-1 text-gray-300">مثال: ساعدني في صياغة 5 أسئلة للامتحان الشهري</p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-tawfeek-primary text-white rounded-br-sm'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-sm text-sm animate-pulse">جاري الكتابة...</div>
                        </div>
                    )}
                    {error && (
                        <div className="text-center">
                            <span className="bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-2 rounded-xl inline-block">{error}</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-100 p-4 flex gap-3 items-end">
                    <textarea
                        className="input-field flex-1 resize-none"
                        rows={2}
                        placeholder="اكتب سؤالك... (Enter للإرسال)"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="btn-primary px-5 py-3 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '...' : 'إرسال'}
                    </button>
                </div>
            </div>
        </div>
    );
}
