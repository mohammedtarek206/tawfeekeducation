'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminExamPreviewPage() {
    const { id: examId } = useParams();
    const [exam, setExam] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!examId) return;
        fetch(`/api/admin/exams/${examId}/questions`)
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setExam(res.data.exam);
                    setQuestions(res.data.questions);
                } else {
                    setError(res.message);
                }
            })
            .catch(() => setError('فشل الاتصال بالخادم'))
            .finally(() => setLoading(false));
    }, [examId]);

    if (loading) return <div className="animate-pulse h-96 bg-gray-200 rounded-2xl max-w-3xl mx-auto mt-6" />;
    if (error || !exam) return <div className="text-center py-20 text-red-500 font-bold">{error || 'الامتحان غير موجود'}</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24 pt-4">
            <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-4 rounded-xl font-bold flex items-center justify-between">
                <span>⚠️ وضع المعاينة (كأدمن) - لا يتم احتساب نتائج هنا.</span>
                <Link href={`/admin/exams/${examId}/questions`} className="text-sm underline">العودة لإدارة الأسئلة</Link>
            </div>

            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="font-black text-gray-900 text-lg">{exam.title}</h1>
                    <p className="text-xs text-gray-500">{questions.filter((q) => q.isActive !== false).length} أسئلة · {exam.duration} دقيقة</p>
                </div>
            </div>

            <div className="space-y-6">
                {questions.filter((q) => q.isActive !== false).map((q: any, qi: number) => (
                    <div key={q._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="font-bold text-gray-900 mb-4 whitespace-pre-wrap leading-relaxed">
                            <span className="text-tawfeek-primary ml-2">({qi + 1})</span>
                            {q.text} <span className="text-sm font-normal text-gray-400">({q.points} درجة)</span>
                        </div>
                        {q.image && (
                            <div className="mb-4">
                                <img src={q.image} alt="Question ref" className="max-h-56 rounded-xl border border-gray-200" />
                            </div>
                        )}
                        <div className={`grid gap-3 ${q.choices.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {q.choices.map((choice: any, ci: number) => (
                                <button
                                    key={ci}
                                    className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm ${choice.isCorrect ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
                                    disabled
                                >
                                    {q.type !== 'true_false' && <span className="font-bold ml-2">{['أ', 'ب', 'ج', 'د', 'هـ', 'و'][ci] || ci + 1}.</span>}
                                    <span className={q.type === 'true_false' ? 'text-center block w-full' : ''}>{choice.text} {choice.isCorrect && '(صحيح)'}</span>
                                </button>
                            ))}
                        </div>
                        {q.explanation && (
                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                                <b>شرح الإجابة:</b> {q.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
