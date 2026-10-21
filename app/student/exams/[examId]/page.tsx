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
    const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct' | 'unanswered' | 'essay'>('all');

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
    if (result) {
        // Case A: showResultImmediately is false - admin will publish later
        if (result.showResultImmediately === false) {
            return (
                <div className="max-w-2xl mx-auto space-y-6 pt-10 pb-16 animate-fadeIn">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center space-y-6">
                        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 text-tawfeek-primary flex items-center justify-center text-4xl shadow-inner">
                            🎉
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">تم استلام إجاباتك بنجاح!</h2>
                            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                                تم تسجيل محاولتك في الامتحان رسميًا. إعدادات هذا الامتحان تتطلب مراجعة واعتماد النتيجة قبل نشرها.
                            </p>
                        </div>
                        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-800 text-sm max-w-md mx-auto flex items-center gap-3 text-right">
                            <span className="text-2xl shrink-0">⏳</span>
                            <div>
                                <div className="font-bold">النتيجة قيد المراجعة</div>
                                <div className="text-xs text-amber-700 mt-0.5">ستظهر درجاتك ومراجعة الإجابات فور اعتمادها من المعلم.</div>
                            </div>
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/student/exams" className="btn-primary px-8 py-3 text-center">
                                العودة للامتحانات
                            </Link>
                            <Link href="/student/questions" className="btn-secondary px-8 py-3 text-center bg-white text-tawfeek-primary border border-tawfeek-primary">
                                الانتقال لبنك الأسئلة للتدريب
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        const reviewList: any[] = result.review || [];
        const wrongList = reviewList.filter((q) => q.type !== 'essay' && !q.isCorrect && q.selectedChoiceIndex >= 0);
        const correctList = reviewList.filter((q) => q.isCorrect);
        const unattemptedList = reviewList.filter((q) => q.type !== 'essay' && q.selectedChoiceIndex < 0);
        const essayList = reviewList.filter((q) => q.type === 'essay');

        const filteredReview = reviewList.filter((q) => {
            if (reviewFilter === 'wrong') return q.type !== 'essay' && !q.isCorrect && q.selectedChoiceIndex >= 0;
            if (reviewFilter === 'correct') return q.isCorrect;
            if (reviewFilter === 'unanswered') return q.type !== 'essay' && q.selectedChoiceIndex < 0;
            if (reviewFilter === 'essay') return q.type === 'essay';
            return true;
        });

        return (
            <div className="max-w-3xl mx-auto space-y-6 pt-6 pb-20 animate-fadeIn">
                {/* Result Hero Banner */}
                {result.hasUngradedEssays ? (
                    <div className="rounded-3xl p-6 sm:p-8 text-center bg-gradient-to-br from-amber-500 via-amber-600 to-orange-500 text-white shadow-lg">
                        <div className="text-5xl mb-3">📋</div>
                        <h2 className="text-2xl sm:text-3xl font-black mb-1">تم تسليم إجابات الامتحان!</h2>
                        <p className="text-white/90 text-sm max-w-md mx-auto leading-relaxed">
                            يحتوي الامتحان على <span className="font-bold underline">{result.essayCount} سؤال مقالي</span> بانتظار تصحيح المعلم.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold">
                            الدرجة الحالية (الأسئلة الموضوعية): {result.score} / {result.totalPoints}
                        </div>
                    </div>
                ) : (
                    <div className={`rounded-3xl p-6 sm:p-8 text-center text-white shadow-lg ${result.passed ? 'bg-gradient-to-br from-tawfeek-primary via-emerald-700 to-tawfeek-primary/90' : 'bg-gradient-to-br from-rose-500 via-red-600 to-rose-600'}`}>
                        <div className="text-5xl mb-3">{result.passed ? '🏆' : '📝'}</div>
                        <h2 className="text-2xl sm:text-3xl font-black mb-1">{result.passed ? 'أحسنت! أداء رائع' : 'محاولة جيدة — راجع أخطاءك'}</h2>
                        <div className="text-5xl sm:text-6xl font-black my-3 tracking-tight">{result.percentage}%</div>
                        <p className="text-white/90 text-sm">
                            حصلت على <span className="font-bold">{result.score}</span> من <span className="font-bold">{result.totalPoints}</span> درجة
                        </p>
                    </div>
                )}

                {/* Score Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
                        <span className="text-xs text-gray-400 block mb-1">الدرجة المحصلة</span>
                        <div className="text-xl sm:text-2xl font-black text-gray-900">{result.score} <span className="text-xs text-gray-400 font-normal">/ {result.totalPoints}</span></div>
                    </div>
                    <div className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 text-center">
                        <span className="text-xs text-emerald-700 block mb-1">إجابات صحيحة ✔️</span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-700">{result.correctAnswers ?? correctList.length}</div>
                    </div>
                    <div className="bg-rose-50/60 rounded-2xl border border-rose-100 p-4 text-center">
                        <span className="text-xs text-rose-700 block mb-1">إجابات خاطئة ❌</span>
                        <div className="text-xl sm:text-2xl font-black text-rose-700">{result.wrongAnswers ?? wrongList.length}</div>
                    </div>
                    <div className="bg-amber-50/60 rounded-2xl border border-amber-100 p-4 text-center">
                        <span className="text-xs text-amber-700 block mb-1">لم يُحل أو مقالي ⏳</span>
                        <div className="text-xl sm:text-2xl font-black text-amber-700">{(result.unansweredCount ?? unattemptedList.length) + (result.essayCount ?? essayList.length)}</div>
                    </div>
                </div>

                {result.earnedPoints > 0 && (
                    <div className="bg-gradient-to-r from-tawfeek-primary/10 via-emerald-50 to-tawfeek-primary/10 rounded-2xl border border-tawfeek-primary/20 p-4 text-center">
                        <span className="text-xs text-tawfeek-primary font-bold block mb-0.5">نقاط التميز المكتسبة</span>
                        <div className="text-2xl font-black text-tawfeek-primary">+{result.earnedPoints} نقطة 🌟</div>
                    </div>
                )}

                {/* Question Review Section */}
                {reviewList.length > 0 && (
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <span>📖</span> مراجعة الأسئلة والإجابات النموذجية
                            </h3>
                            {/* Filter tabs */}
                            <div className="flex flex-wrap gap-1.5 text-xs">
                                <button
                                    onClick={() => setReviewFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${reviewFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    الكل ({reviewList.length})
                                </button>
                                {wrongList.length > 0 && (
                                    <button
                                        onClick={() => setReviewFilter('wrong')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${reviewFilter === 'wrong' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                    >
                                        الخاطئة ({wrongList.length})
                                    </button>
                                )}
                                {correctList.length > 0 && (
                                    <button
                                        onClick={() => setReviewFilter('correct')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${reviewFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                    >
                                        الصحيحة ({correctList.length})
                                    </button>
                                )}
                                {unattemptedList.length > 0 && (
                                    <button
                                        onClick={() => setReviewFilter('unanswered')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${reviewFilter === 'unanswered' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                                    >
                                        لم تُحل ({unattemptedList.length})
                                    </button>
                                )}
                                {essayList.length > 0 && (
                                    <button
                                        onClick={() => setReviewFilter('essay')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${reviewFilter === 'essay' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                                    >
                                        المقالية ({essayList.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List of reviewed questions */}
                        <div className="space-y-5">
                            {filteredReview.map((q: any, qi: number) => {
                                const isEssay = q.type === 'essay';
                                const isUnattempted = !isEssay && q.selectedChoiceIndex < 0;
                                const isWrong = !isEssay && !q.isCorrect && q.selectedChoiceIndex >= 0;
                                const isRight = !isEssay && q.isCorrect;

                                return (
                                    <div
                                        key={q.questionId || qi}
                                        className={`bg-white rounded-2xl border-2 p-5 sm:p-6 shadow-sm transition-all ${
                                            isRight
                                                ? 'border-emerald-200'
                                                : isWrong
                                                ? 'border-rose-200'
                                                : isEssay
                                                ? 'border-purple-200'
                                                : 'border-amber-200'
                                        }`}
                                    >
                                        {/* Question header */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-gray-700 text-sm">السؤال ({qi + 1})</span>
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                    isEssay ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {isEssay ? '✍️ مقالي' : q.type === 'true_false' ? '⚖️ صح أو خطأ' : '🔘 اختيار من متعدد'}
                                                </span>
                                            </div>
                                            {/* Status Badge */}
                                            <div>
                                                {isRight && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                                        <span>✔</span> إجابة صحيحة (+{q.pointsEarned}/{q.points})
                                                    </span>
                                                )}
                                                {isWrong && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                                                        <span>✘</span> إجابة خاطئة (0/{q.points})
                                                    </span>
                                                )}
                                                {isUnattempted && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                                        <span>⚠️</span> لم تجب (0/{q.points})
                                                    </span>
                                                )}
                                                {isEssay && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                                                        <span>⏳</span> بانتظار تصحيح المعلم
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Question Text */}
                                        <div className="font-bold text-gray-900 text-base leading-relaxed mb-4 whitespace-pre-wrap">
                                            {q.text}
                                        </div>

                                        {q.image && (
                                            <div className="mb-4">
                                                <img src={q.image} alt="توضيح السؤال" className="max-h-60 rounded-xl border border-gray-200" />
                                            </div>
                                        )}

                                        {/* Choices */}
                                        {!isEssay && q.choices && q.choices.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                                {q.choices.map((c: any, ci: number) => {
                                                    const isSelectedByStudent = q.selectedChoiceIndex === ci;
                                                    const isModelCorrect = c.isCorrect;

                                                    let choiceStyle = 'border-gray-200 bg-gray-50/50 text-gray-700';
                                                    let badge = null;

                                                    if (isModelCorrect) {
                                                        choiceStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold';
                                                        badge = (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-300">
                                                                ✔ {isSelectedByStudent ? 'إجابتك الصحيحة' : 'الإجابة النموذجية الصحيحة'}
                                                            </span>
                                                        );
                                                    } else if (isSelectedByStudent && !isModelCorrect) {
                                                        choiceStyle = 'border-rose-400 bg-rose-50/80 text-rose-950 font-medium';
                                                        badge = (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-white/80 px-2 py-0.5 rounded border border-rose-300">
                                                                ✘ إجابتك التي اخترتها
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <div
                                                            key={ci}
                                                            className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 text-sm transition-all ${choiceStyle}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {q.type !== 'true_false' && (
                                                                    <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center font-bold text-xs shrink-0">
                                                                        {['أ', 'ب', 'ج', 'د', 'هـ', 'و'][ci] || ci + 1}
                                                                    </span>
                                                                )}
                                                                <span>{c.text}</span>
                                                            </div>
                                                            {badge}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Essay student response & model answer */}
                                        {isEssay && (
                                            <div className="space-y-3 mb-4">
                                                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 text-sm">
                                                    <div className="text-xs font-bold text-purple-800 mb-1">✍️ إجابتك المسجلة:</div>
                                                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                        {q.essayAnswer && q.essayAnswer.trim().length > 0 ? q.essayAnswer : <span className="text-gray-400 italic">لم تقدم إجابة عن هذا السؤال.</span>}
                                                    </p>
                                                </div>
                                                {q.modelAnswer && (
                                                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-sm">
                                                        <div className="text-xs font-bold text-emerald-800 mb-1">🎯 الإجابة النموذجية الاسترشادية:</div>
                                                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{q.modelAnswer}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Explanation Box */}
                                        {q.explanation && q.explanation.trim().length > 0 ? (
                                            <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-950 text-xs sm:text-sm leading-relaxed">
                                                <div className="font-bold flex items-center gap-1.5 text-blue-900 mb-1">
                                                    <span>💡</span> الشرح والتوضيح:
                                                </div>
                                                <p className="whitespace-pre-wrap text-blue-900/90">{q.explanation}</p>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                                                لا يتوفر شرح إضافي لهذا السؤال في بنك الأسئلة.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/student/exams" className="btn-primary px-8 py-3 text-center">
                        العودة لصفحة الامتحانات
                    </Link>
                    <Link href="/student/questions" className="btn-secondary px-8 py-3 text-center bg-white text-tawfeek-primary border border-tawfeek-primary">
                        التدرب على مزيد من الأسئلة في البنك
                    </Link>
                </div>
            </div>
        );
    }

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
