'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BlockedContentCard from '@/components/shared/BlockedContentCard';


export default function ExamTakingPage() {
    const { examId } = useParams();
    const router = useRouter();
    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // MCQ Answers: { [questionId]: selectedIndex }
    const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
    // Essay Answers: { [questionId]: text }
    const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const [blockedReason, setBlockedReason] = useState<string | null>(null);

    useEffect(() => {
        if (!examId) return;
        fetch(`/api/student/exams/${examId}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setExam(res.data.exam);
                    setTimeLeft(res.data.exam.duration * 60);
                } else {
                    if (res.requireSubscription || res.reason) {
                        setBlockedReason(res.reason || 'no_subscription');
                    }
                    setError(res.message || 'الامتحان غير موجود');
                }
            })
            .catch(() => setError('خطأ في الاتصال'))
            .finally(() => setLoading(false));
    }, [examId]);


    // Countdown timer
    useEffect(() => {
        if (timeLeft === null || result) return;
        if (timeLeft <= 0) { handleSubmit(); return; }
        const t = setTimeout(() => setTimeLeft((prev) => (prev !== null ? prev - 1 : null)), 1000);
        return () => clearTimeout(t);
    }, [timeLeft, result]);

    const handleSubmit = useCallback(async () => {
        if (!exam || submitting || result) return;
        setSubmitting(true);
        try {
            const questions = exam.questions || [];

            // Build unified answers array for all question types
            const answersArray = questions.map((q: any) => {
                if (q.type === 'essay') {
                    return {
                        questionId: q._id,
                        essayAnswer: essayAnswers[q._id] || '',
                    };
                } else {
                    const selectedChoiceIndex = mcqAnswers[q._id];
                    return {
                        questionId: q._id,
                        selectedChoiceIndex: selectedChoiceIndex ?? -1,
                    };
                }
            });

            const res = await fetch('/api/student/exams/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: exam._id,
                    examType: exam.type === 'weekly' ? 'weekly_exam' : exam.type === 'monthly' ? 'monthly_exam' : 'quiz',
                    answers: answersArray,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.message || 'حدث خطأ في التقديم');
            }
        } catch {
            setError('خطأ في الاتصال');
        } finally {
            setSubmitting(false);
        }
    }, [exam, mcqAnswers, essayAnswers, submitting, result]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (loading) return <div className="animate-pulse h-96 bg-gray-200 rounded-2xl max-w-3xl mx-auto" />;

    if (blockedReason) {
        return (
            <div className="max-w-3xl mx-auto pt-6 px-4">
                <BlockedContentCard reason={blockedReason} message={error} />
            </div>
        );
    }

    if (error) return (

        <div className="max-w-xl mx-auto text-center py-20">
            <div className="text-5xl mb-4">❌</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/student/exams" className="btn-primary">العودة للامتحانات</Link>
        </div>
    );
    if (!exam) return null;

    const questions = exam.questions || [];

    // Result screen
    if (result) return (
        <div className="max-w-xl mx-auto space-y-6 pt-6 animate-fadeIn">
            {result.hasUngradedEssays ? (
                // Pending essay grading result
                <div className="rounded-2xl p-8 text-center bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <div className="text-6xl mb-4">📋</div>
                    <h2 className="text-2xl font-black mb-2">تم تسليم الامتحان!</h2>
                    <p className="text-white/90 text-sm mt-2">
                        يحتوي الامتحان على {result.essayCount} سؤال مقالي بانتظار التصحيح من الأدمن.
                    </p>
                    <p className="text-white/80 text-xs mt-2">
                        سيتم إشعارك عند اكتمال التصحيح وإظهار النتيجة النهائية.
                    </p>
                    {result.totalQuestions - result.essayCount > 0 && (
                        <div className="mt-4 bg-white/20 rounded-xl p-4 text-sm">
                            <p className="font-bold">الأسئلة الموضوعية: {result.correctAnswers}/{result.totalQuestions - result.essayCount} إجابة صحيحة</p>
                        </div>
                    )}
                </div>
            ) : (
                // Fully graded result
                <div className={`rounded-2xl p-8 text-center text-white ${result.passed ? 'bg-gradient-to-br from-tawfeek-primary to-tawfeek-primary/80' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                    <div className="text-6xl mb-4">{result.passed ? '🏆' : '📝'}</div>
                    <h2 className="text-3xl font-black mb-2">{result.passed ? 'أحسنت!' : 'حاول مرة أخرى'}</h2>
                    <div className="text-5xl font-black my-4">{result.percentage}%</div>
                    <p className="text-white/80">{result.correctAnswers} من {result.totalQuestions} إجابة صحيحة</p>
                </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-gray-500 mb-2">نقاط مكتسبة</p>
                <div className="text-3xl font-black text-tawfeek-primary">+{result.earnedPoints} نقطة</div>
            </div>
            <Link href="/student/exams" className="btn-secondary block text-center w-full">العودة للامتحانات</Link>
        </div>
    );

    // Count answered questions
    const mcqQuestions = questions.filter((q: any) => q.type !== 'essay');
    const essayQuestions = questions.filter((q: any) => q.type === 'essay');
    const mcqAnsweredCount = Object.keys(mcqAnswers).length;
    const essayAnsweredCount = Object.values(essayAnswers).filter(v => v.trim().length > 0).length;
    const totalAnswered = mcqAnsweredCount + essayAnsweredCount;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24 pt-4">
            {/* Sticky Timer Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="font-black text-gray-900 text-lg">{exam.title}</h1>
                    <p className="text-xs text-gray-500">{totalAnswered}/{questions.length} أجبت</p>
                </div>
                <div className={`text-2xl font-black px-4 py-2 rounded-xl ${timeLeft !== null && timeLeft < 120 ? 'text-red-600 bg-red-50 animate-pulse' : 'text-gray-900 bg-gray-100'}`}>
                    {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
                {questions.map((q: any, qi: number) => (
                    <div key={q._id} className={`bg-white rounded-2xl border shadow-sm p-6 ${q.type === 'essay' ? 'border-purple-200' : 'border-gray-100'}`}>
                        {/* Question header */}
                        <div className="flex items-start gap-3 mb-4">
                            <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${q.type === 'essay' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                {q.type === 'essay' ? '✍️ مقالي' : '🔘 اختيار'}
                            </span>
                            <div className="font-bold text-gray-900 whitespace-pre-wrap leading-relaxed">
                                <span className="text-tawfeek-primary ml-2">({qi + 1})</span>
                                {q.text}
                            </div>
                        </div>

                        {/* Question points */}
                        <div className="text-xs text-gray-400 mb-3">الدرجة: {q.points} {q.points === 1 ? 'نقطة' : 'نقاط'}</div>

                        {q.image && (
                            <div className="mb-4">
                                <img src={q.image} alt="Question ref" className="max-h-56 rounded-xl border border-gray-200" />
                            </div>
                        )}

                        {/* MCQ / True-False choices */}
                        {q.type !== 'essay' && (
                            <div className={`grid gap-3 ${q.choices.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {q.choices.map((choice: { text: string }, ci: number) => (
                                    <button
                                        key={ci}
                                        onClick={() => setMcqAnswers({ ...mcqAnswers, [q._id]: ci })}
                                        className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm ${mcqAnswers[q._id] === ci
                                            ? 'border-tawfeek-primary bg-tawfeek-primary/10 text-tawfeek-primary'
                                            : 'border-gray-200 bg-gray-50 hover:border-tawfeek-primary/50 text-gray-700'
                                            }`}
                                    >
                                        {q.type !== 'true_false' && <span className="font-bold ml-2">{['أ', 'ب', 'ج', 'د', 'هـ', 'و'][ci] || ci + 1}.</span>}
                                        <span className={q.type === 'true_false' ? 'text-center block w-full' : ''}>{choice.text}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Essay answer textarea */}
                        {q.type === 'essay' && (
                            <div className="space-y-2">
                                <textarea
                                    dir="rtl"
                                    rows={6}
                                    className="w-full border-2 border-purple-200 focus:border-purple-400 focus:outline-none rounded-xl p-4 text-gray-800 text-sm leading-relaxed resize-y bg-purple-50/30 transition-colors"
                                    placeholder="اكتب إجابتك هنا... (ستتم مراجعتها من قِبل الأدمن)"
                                    value={essayAnswers[q._id] || ''}
                                    onChange={(e) => setEssayAnswers({ ...essayAnswers, [q._id]: e.target.value })}
                                />
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>{essayAnswers[q._id] ? '✍️ تمت الإجابة' : 'لم تتم الإجابة بعد'}</span>
                                    <span>{(essayAnswers[q._id] || '').length} حرف</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Submit Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 z-20">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <span className="text-sm text-gray-500 flex-1">
                        أجبت على {totalAnswered} من {questions.length} سؤال
                        {totalAnswered < questions.length && <span className="text-orange-500 mr-1">· لم تجب على {questions.length - totalAnswered} أسئلة</span>}
                    </span>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (mcqAnsweredCount === 0 && essayAnsweredCount === 0)}
                        className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'جاري التقديم...' : 'تسليم الامتحان'}
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm text-center">{error}</div>}
        </div>
    );
}
