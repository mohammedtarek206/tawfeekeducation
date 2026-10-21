'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SUBJECTS, getSubjectLabel } from '@/lib/constants/subjects';
import { gradeLabel } from '@/lib/constants/grades';

interface QuestionItem {
    _id: string;
    text: string;
    type: 'mcq' | 'true_false' | 'essay';
    choices: Array<{ text: string }>;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    subject: string;
    grade: string;
    image?: string;
    isSolved?: boolean;
}

interface SingleCheckResult {
    isCorrect: boolean;
    type: string;
    selectedChoiceIndex?: number;
    correctChoiceIndex?: number;
    correctAnswer?: string;
    explanation?: string;
    modelAnswer?: string;
    gradingCriteria?: string;
    pointsEarned: number;
    maxPoints: number;
}

interface SessionReviewItem {
    questionId: string;
    text: string;
    type: string;
    choices?: Array<{ text: string; isCorrect: boolean }>;
    points: number;
    pointsEarned: number;
    status: 'correct' | 'wrong' | 'unanswered' | 'essay_submitted';
    selectedChoiceIndex?: number;
    studentAnswer?: string;
    correctChoiceIndex?: number;
    correctAnswer?: string;
    explanation?: string;
    modelAnswer?: string;
}

interface SessionSummary {
    attemptId: string;
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    totalQuestions: number;
    timeSpent: number;
    hasUngradedEssays: boolean;
    review: SessionReviewItem[];
}

const DIFF_BADGES: Record<string, { label: string; color: string }> = {
    easy: { label: 'سهل', color: 'bg-green-100 text-green-700' },
    medium: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-800' },
    hard: { label: 'صعب', color: 'bg-red-100 text-red-700' },
};

export default function StudentQuestionBankPage() {
    // Bank list state
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState<{ totalAvailable: number; totalSolved: number }>({
        totalAvailable: 0,
        totalSolved: 0,
    });

    // Filters
    const [subjectFilter, setSubjectFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [diffFilter, setDiffFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all | unsolved | solved
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Quick Practice in-line answers & verification state
    const [inlineAnswers, setInlineAnswers] = useState<Record<string, number>>({});
    const [inlineEssay, setInlineEssay] = useState<Record<string, string>>({});
    const [inlineResults, setInlineResults] = useState<Record<string, SingleCheckResult>>({});
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    // Focused Practice Session state
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionQuestions, setSessionQuestions] = useState<QuestionItem[]>([]);
    const [sessionCurrentIndex, setSessionCurrentIndex] = useState(0);
    const [sessionAnswers, setSessionAnswers] = useState<Record<string, number>>({});
    const [sessionEssay, setSessionEssay] = useState<Record<string, string>>({});
    const [sessionMode, setSessionMode] = useState<'immediate' | 'after_submit'>('after_submit');
    const [sessionCheckResults, setSessionCheckResults] = useState<Record<string, SingleCheckResult>>({});
    const [sessionSubmitting, setSessionSubmitting] = useState(false);
    const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
    const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');
    const [sessionStartTime, setSessionStartTime] = useState<number>(0);

    // Load question bank from API
    const loadQuestions = useCallback(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
            page: String(page),
            limit: '20',
        });
        if (subjectFilter) params.set('subject', subjectFilter);
        if (typeFilter) params.set('type', typeFilter);
        if (diffFilter) params.set('difficulty', diffFilter);
        if (statusFilter) params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());

        fetch(`/api/student/questions?${params.toString()}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setQuestions(res.data.questions || []);
                    setTotalPages(res.data.pages || 1);
                    if (res.data.stats) {
                        setStats(res.data.stats);
                    }
                } else {
                    setError(res.message || 'فشل في تحميل بنك الأسئلة');
                }
            })
            .catch(() => setError('فشل الاتصال بالخادم'))
            .finally(() => setLoading(false));
    }, [page, subjectFilter, typeFilter, diffFilter, statusFilter, search]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    // Handle single question check (Quick Practice)
    const handleCheckSingle = async (q: QuestionItem) => {
        const choiceIdx = inlineAnswers[q._id];
        const essayText = inlineEssay[q._id];

        if (q.type !== 'essay' && (choiceIdx === undefined || choiceIdx === null)) {
            alert('يرجى اختيار إجابة أولاً قبل التحقق');
            return;
        }

        setVerifyingId(q._id);
        try {
            const res = await fetch('/api/student/questions/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_single',
                    questionId: q._id,
                    selectedChoiceIndex: choiceIdx,
                    essayAnswer: essayText,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setInlineResults((prev) => ({ ...prev, [q._id]: data.data }));
            } else {
                alert(data.message || 'حدث خطأ في التحقق');
            }
        } catch {
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setVerifyingId(null);
        }
    };

    // Start Focused Practice Session
    const startPracticeSession = (count: number) => {
        // Filter candidate questions based on active filters
        let pool = [...questions];
        if (statusFilter === 'unsolved') {
            pool = pool.filter((q) => !q.isSolved);
        }
        if (pool.length === 0) {
            pool = [...questions];
        }

        // Shuffle
        const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, count);
        if (shuffled.length === 0) {
            alert('لا توجد أسئلة متاحة لبدء جلسة تدريب');
            return;
        }

        setSessionQuestions(shuffled);
        setSessionCurrentIndex(0);
        setSessionAnswers({});
        setSessionEssay({});
        setSessionCheckResults({});
        setSessionSummary(null);
        setSessionStartTime(Date.now());
        setSessionActive(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Session: Check question in immediate mode
    const handleSessionCheckImmediate = async () => {
        const currentQ = sessionQuestions[sessionCurrentIndex];
        if (!currentQ) return;
        const choiceIdx = sessionAnswers[currentQ._id];
        const essayText = sessionEssay[currentQ._id];

        if (currentQ.type !== 'essay' && (choiceIdx === undefined || choiceIdx === null)) {
            alert('اختر إجابة أولاً');
            return;
        }

        setVerifyingId(currentQ._id);
        try {
            const res = await fetch('/api/student/questions/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_single',
                    questionId: currentQ._id,
                    selectedChoiceIndex: choiceIdx,
                    essayAnswer: essayText,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSessionCheckResults((prev) => ({ ...prev, [currentQ._id]: data.data }));
            }
        } catch {
            alert('خطأ في الاتصال');
        } finally {
            setVerifyingId(null);
        }
    };

    // Submit Complete Practice Session
    const handleSubmitSession = async () => {
        if (sessionSubmitting) return;

        const unansweredCount = sessionQuestions.filter((q) => {
            if (q.type === 'essay') return !sessionEssay[q._id]?.trim();
            return sessionAnswers[q._id] === undefined;
        }).length;

        if (unansweredCount > 0) {
            const confirm = window.confirm(`لديك ${unansweredCount} أسئلة لم تُجب عليها بعد. هل تريد تسليم الجلسة وعرض النتيجة؟`);
            if (!confirm) return;
        }

        setSessionSubmitting(true);
        const timeSpent = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));

        try {
            const answersArray = sessionQuestions.map((q) => ({
                questionId: q._id,
                selectedChoiceIndex: sessionAnswers[q._id] !== undefined ? sessionAnswers[q._id] : -1,
                essayAnswer: sessionEssay[q._id] || '',
            }));

            const res = await fetch('/api/student/questions/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit_session',
                    answers: answersArray,
                    timeSpent,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSessionSummary(data.data);
                loadQuestions(); // refresh solved count
            } else {
                alert(data.message || 'حدث خطأ في تسليم جلسة التدريب');
            }
        } catch {
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setSessionSubmitting(false);
        }
    };

    const currentSessionQ = sessionQuestions[sessionCurrentIndex];
    const sessionAnsweredCount = sessionQuestions.filter((q) =>
        q.type === 'essay' ? sessionEssay[q._id]?.trim() : sessionAnswers[q._id] !== undefined
    ).length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20 pt-2" dir="rtl">
            {/* Top Banner & Stats */}
            <div className="bg-gradient-to-br from-forest to-forest/90 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-3 border border-white/20">
                            <span>💡 بنك الأسئلة المعتمد</span>
                            {questions[0]?.grade && (
                                <>
                                    <span>·</span>
                                    <span>{gradeLabel(questions[0].grade)}</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black mb-2">تدرب وتفوق في التاريخ والدراسات 🏆</h1>
                        <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                            مئات الأسئلة المقالية والاختيارية مع الإجابات النموذجية والشرح التفصيلي لضمان تثبيت المعلومة قبل الامتحانات.
                        </p>
                    </div>

                    {/* Stats pills */}
                    <div className="flex gap-3 shrink-0 flex-wrap">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/15 min-w-[100px]">
                            <div className="text-2xl sm:text-3xl font-black text-gold">{stats.totalAvailable}</div>
                            <div className="text-[11px] text-white/80 font-bold mt-1">سؤال متاح لصفك</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/15 min-w-[100px]">
                            <div className="text-2xl sm:text-3xl font-black text-green-300">{stats.totalSolved}</div>
                            <div className="text-[11px] text-white/80 font-bold mt-1">سؤال تم حله</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* FOCUSED PRACTICE SESSION MODAL / OVERLAY                          */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {sessionActive && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full p-6 sm:p-8 space-y-6 my-auto animate-fadeIn max-h-[95vh] overflow-y-auto">
                        {/* Session Result Summary Screen */}
                        {sessionSummary ? (
                            <div className="space-y-6 text-center">
                                <div className="text-6xl animate-bounce">
                                    {sessionSummary.passed ? '🎉' : '📚'}
                                </div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                                        {sessionSummary.passed ? 'أحسنت! أداء رائع في التدريب' : 'تدريب مفيد! استمر في المحاولة'}
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">
                                        تم الانتهاء من جلسة التدريب وحفظ نتيجتك بنجاح (+5 نقاط تدريب)
                                    </p>
                                </div>

                                {/* Score Overview Card */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-forest/5 border border-forest/20 rounded-2xl p-4">
                                        <div className="text-3xl font-black text-forest">{sessionSummary.percentage}%</div>
                                        <div className="text-xs text-gray-500 font-bold mt-1">النسبة المئوية</div>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                                        <div className="text-3xl font-black text-green-600">{sessionSummary.correctCount}</div>
                                        <div className="text-xs text-gray-500 font-bold mt-1">إجابات صحيحة ✓</div>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                                        <div className="text-3xl font-black text-red-600">{sessionSummary.wrongCount}</div>
                                        <div className="text-xs text-gray-500 font-bold mt-1">إجابات خاطئة ✗</div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                        <div className="text-3xl font-black text-gray-700">{sessionSummary.unansweredCount}</div>
                                        <div className="text-xs text-gray-500 font-bold mt-1">لم تتم الإجابة</div>
                                    </div>
                                </div>

                                {/* Review Filter Tabs */}
                                <div className="flex gap-2 justify-center border-b border-gray-100 pb-3">
                                    <button
                                        onClick={() => setReviewFilter('all')}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            reviewFilter === 'all' ? 'bg-forest text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        جميع الأسئلة ({sessionSummary.review.length})
                                    </button>
                                    <button
                                        onClick={() => setReviewFilter('wrong')}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            reviewFilter === 'wrong' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
                                        }`}
                                    >
                                        التي تحتاج مراجعة ⚠️ ({sessionSummary.wrongCount})
                                    </button>
                                    <button
                                        onClick={() => setReviewFilter('correct')}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            reviewFilter === 'correct' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'
                                        }`}
                                    >
                                        الصحيحة ✓ ({sessionSummary.correctCount})
                                    </button>
                                </div>

                                {/* Detailed Question-by-Question Review */}
                                <div className="space-y-4 text-right max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                                    {sessionSummary.review
                                        .filter((item) => {
                                            if (reviewFilter === 'wrong') return item.status === 'wrong' || item.status === 'unanswered';
                                            if (reviewFilter === 'correct') return item.status === 'correct';
                                            return true;
                                        })
                                        .map((item, idx) => (
                                            <div key={item.questionId} className="pt-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-400 text-xs">سؤال #{idx + 1}</span>
                                                    <span
                                                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                                            item.status === 'correct'
                                                                ? 'bg-green-100 text-green-800'
                                                                : item.status === 'wrong'
                                                                ? 'bg-red-100 text-red-800'
                                                                : item.status === 'essay_submitted'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {item.status === 'correct'
                                                            ? '✓ إجابة صحيحة'
                                                            : item.status === 'wrong'
                                                            ? '✗ إجابة خاطئة'
                                                            : item.status === 'essay_submitted'
                                                            ? '✍️ إجابة مقالية'
                                                            : 'لم تتم الإجابة'}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-gray-900 text-sm leading-relaxed">{item.text}</h4>

                                                {/* MCQ Choices Comparison */}
                                                {item.type !== 'essay' && item.choices && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                        {item.choices.map((c, ci) => {
                                                            const isStudentChoice = item.selectedChoiceIndex === ci;
                                                            const isCorrectChoice = c.isCorrect;
                                                            let cardStyle = 'bg-gray-50 border-gray-200 text-gray-600';
                                                            if (isCorrectChoice) cardStyle = 'bg-green-50 border-green-300 text-green-900 font-bold';
                                                            if (isStudentChoice && !isCorrectChoice) cardStyle = 'bg-red-50 border-red-300 text-red-900 font-bold line-through';

                                                            return (
                                                                <div key={ci} className={`p-2.5 rounded-xl border flex items-center justify-between ${cardStyle}`}>
                                                                    <span>{c.text}</span>
                                                                    {isCorrectChoice && <span className="text-green-600 text-xs font-bold">✓ الصحيحة</span>}
                                                                    {isStudentChoice && !isCorrectChoice && <span className="text-red-600 text-xs font-bold">إجابتك</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Essay Review */}
                                                {item.type === 'essay' && (
                                                    <div className="space-y-2 bg-purple-50/60 border border-purple-200 rounded-xl p-3 text-xs">
                                                        {item.studentAnswer && (
                                                            <div>
                                                                <span className="font-bold text-gray-700 block mb-1">إجابتك المكتوبة:</span>
                                                                <p className="bg-white p-2 rounded-lg border border-purple-100 text-gray-800">{item.studentAnswer}</p>
                                                            </div>
                                                        )}
                                                        {item.modelAnswer && (
                                                            <div>
                                                                <span className="font-bold text-purple-900 block mb-1">الإجابة النموذجية:</span>
                                                                <p className="bg-white p-2 rounded-lg border border-purple-200 text-purple-900 font-bold">{item.modelAnswer}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Explanation */}
                                                {item.explanation && (
                                                    <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs">
                                                        <span className="font-bold block mb-1">💡 الشرح والتوضيح:</span>
                                                        {item.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>

                                <div className="pt-4 flex gap-3 justify-center">
                                    <button
                                        onClick={() => setSessionActive(false)}
                                        className="btn-primary px-8 py-2.5 text-sm font-bold"
                                    >
                                        إغلاق والعودة للبنك
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Active Question View in Session */
                            currentSessionQ && (
                                <div className="space-y-5">
                                    {/* Session Header */}
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-forest/10 text-forest font-black px-3 py-1 rounded-xl text-xs">
                                                السؤال {sessionCurrentIndex + 1} من {sessionQuestions.length}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                تم حل: {sessionAnsweredCount}/{sessionQuestions.length}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('هل تريد إنهاء جلسة التدريب والخروج؟')) {
                                                    setSessionActive(false);
                                                }
                                            }}
                                            className="text-xs text-gray-400 hover:text-red-500 font-bold"
                                        >
                                            ✕ خروج
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-forest h-full transition-all duration-300"
                                            style={{
                                                width: `${((sessionCurrentIndex + 1) / sessionQuestions.length) * 100}%`,
                                            }}
                                        />
                                    </div>

                                    {/* Question Card */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">
                                                {currentSessionQ.type === 'essay' ? '✍️ سؤال مقالي' : '🔘 اختيار من متعدد'}
                                            </span>
                                            <span className="text-xs text-forest font-bold">
                                                {currentSessionQ.points} {currentSessionQ.points === 1 ? 'درجة' : 'درجات'}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-black text-gray-900 leading-relaxed whitespace-pre-wrap">
                                            {currentSessionQ.text}
                                        </h3>

                                        {currentSessionQ.image && (
                                            <img
                                                src={currentSessionQ.image}
                                                alt="توضيح السؤال"
                                                className="max-h-48 rounded-2xl border border-gray-200"
                                            />
                                        )}

                                        {/* MCQ Choices */}
                                        {currentSessionQ.type !== 'essay' && (
                                            <div className="space-y-2.5">
                                                {currentSessionQ.choices?.map((c, ci) => {
                                                    const isSelected = sessionAnswers[currentSessionQ._id] === ci;
                                                    const verified = sessionCheckResults[currentSessionQ._id];
                                                    let choiceStyle = 'border-gray-200 bg-gray-50/70 hover:border-forest/50 text-gray-800';

                                                    if (verified) {
                                                        if (ci === verified.correctChoiceIndex) {
                                                            choiceStyle = 'border-green-400 bg-green-50 text-green-900 font-bold ring-1 ring-green-400';
                                                        } else if (isSelected && !verified.isCorrect) {
                                                            choiceStyle = 'border-red-400 bg-red-50 text-red-900 font-bold line-through';
                                                        }
                                                    } else if (isSelected) {
                                                        choiceStyle = 'border-forest bg-forest/10 text-forest font-bold ring-1 ring-forest';
                                                    }

                                                    return (
                                                        <button
                                                            key={ci}
                                                            type="button"
                                                            disabled={Boolean(verified)}
                                                            onClick={() => setSessionAnswers((prev) => ({ ...prev, [currentSessionQ._id]: ci }))}
                                                            className={`w-full text-right p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-sm ${choiceStyle}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 bg-white">
                                                                    {['أ', 'ب', 'ج', 'د', 'هـ', 'و'][ci] || ci + 1}
                                                                </span>
                                                                <span>{c.text}</span>
                                                            </div>
                                                            {verified && ci === verified.correctChoiceIndex && (
                                                                <span className="text-green-600 font-bold text-xs">✓ صحيح</span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Essay Textarea */}
                                        {currentSessionQ.type === 'essay' && (
                                            <div className="space-y-2">
                                                <textarea
                                                    rows={5}
                                                    value={sessionEssay[currentSessionQ._id] || ''}
                                                    onChange={(e) => setSessionEssay((prev) => ({ ...prev, [currentSessionQ._id]: e.target.value }))}
                                                    placeholder="اكتب إجابتك هنا..."
                                                    className="w-full border-2 border-purple-200 rounded-2xl p-4 text-sm leading-relaxed outline-none focus:border-purple-400 bg-purple-50/20 resize-y"
                                                    dir="rtl"
                                                />
                                            </div>
                                        )}

                                        {/* Immediate Feedback Box if verified */}
                                        {sessionCheckResults[currentSessionQ._id] && (
                                            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-4 text-sm space-y-2">
                                                <div className="font-bold flex items-center gap-2">
                                                    <span>💡 الإجابة والشرح:</span>
                                                    <span className={sessionCheckResults[currentSessionQ._id].isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                        {sessionCheckResults[currentSessionQ._id].isCorrect ? 'إجابتك صحيحة!' : 'إجابة غير صحيحة'}
                                                    </span>
                                                </div>
                                                {sessionCheckResults[currentSessionQ._id].explanation && (
                                                    <p>{sessionCheckResults[currentSessionQ._id].explanation}</p>
                                                )}
                                                {sessionCheckResults[currentSessionQ._id].modelAnswer && (
                                                    <p>
                                                        <strong>الإجابة النموذجية:</strong> {sessionCheckResults[currentSessionQ._id].modelAnswer}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation & Action Buttons */}
                                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 flex-wrap">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSessionCurrentIndex((p) => Math.max(0, p - 1))}
                                                disabled={sessionCurrentIndex === 0}
                                                className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-40"
                                            >
                                                ← السابق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSessionCurrentIndex((p) => Math.min(sessionQuestions.length - 1, p + 1))}
                                                disabled={sessionCurrentIndex === sessionQuestions.length - 1}
                                                className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-40"
                                            >
                                                التالي →
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Immediate verification button if enabled */}
                                            {sessionMode === 'immediate' && !sessionCheckResults[currentSessionQ._id] && (
                                                <button
                                                    type="button"
                                                    onClick={handleSessionCheckImmediate}
                                                    disabled={verifyingId === currentSessionQ._id}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {verifyingId === currentSessionQ._id ? 'جاري التحقق...' : '🔍 تحقق الآن'}
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={handleSubmitSession}
                                                disabled={sessionSubmitting}
                                                className="btn-primary px-6 py-2 text-xs font-bold disabled:opacity-50"
                                            >
                                                {sessionSubmitting ? 'جاري التسليم...' : '🏁 إنهاء التدريب وعرض النتيجة'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Quick Practice Mode Launcher Bar */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black text-gray-900">🚀 بدء تدريب تفاعلي مخصص</h2>
                    <p className="text-gray-500 text-xs mt-1">
                        اختر عدد الأسئلة وابدأ جلسة تدريبية مركزة مع مؤقت وإحصائيات نتيجة فورية.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-bold bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                        <span>طريقة التصحيح:</span>
                        <select
                            value={sessionMode}
                            onChange={(e) => setSessionMode(e.target.value as any)}
                            className="bg-transparent font-bold text-forest outline-none cursor-pointer"
                        >
                            <option value="after_submit">بعد إنهاء الجلسة</option>
                            <option value="immediate">مباشر بعد كل سؤال</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        {[5, 10, 20].map((num) => (
                            <button
                                key={num}
                                onClick={() => startPracticeSession(num)}
                                className="btn-primary py-2 px-4 text-xs font-bold"
                            >
                                {num} أسئلة
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="🔍 ابحث في الأسئلة..."
                    className="border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 min-w-[180px] flex-1"
                />

                <select
                    value={subjectFilter}
                    onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold text-gray-700"
                >
                    <option value="">كل المواد</option>
                    {SUBJECTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>

                <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold text-gray-700"
                >
                    <option value="">كل أنواع الأسئلة</option>
                    <option value="mcq">اختيار من متعدد</option>
                    <option value="true_false">صح أو خطأ</option>
                    <option value="essay">أسئلة مقالية</option>
                </select>

                <select
                    value={diffFilter}
                    onChange={(e) => { setDiffFilter(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold text-gray-700"
                >
                    <option value="">كل المستويات</option>
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-bold text-gray-700"
                >
                    <option value="all">جميع الأسئلة</option>
                    <option value="unsolved">أسئلة لم أحلها بعد</option>
                    <option value="solved">أسئلة تم حلها</option>
                </select>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-center font-bold text-sm">
                    {error}
                </div>
            )}

            {/* Questions List (Browse & Instant Solve Mode) */}
            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                                <div className="h-6 bg-gray-200 rounded w-3/4" />
                                <div className="h-20 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : questions.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-3">
                        <div className="text-5xl">📑</div>
                        <h3 className="font-black text-gray-800 text-lg">لا توجد أسئلة متاحة</h3>
                        <p className="text-gray-500 text-xs">
                            جرب تغيير الفلاتر أو البحث للاطلاع على أسئلة أخرى.
                        </p>
                    </div>
                ) : (
                    questions.map((q, idx) => {
                        const verified = inlineResults[q._id];
                        const diffInfo = DIFF_BADGES[q.difficulty] || DIFF_BADGES.medium;

                        return (
                            <div
                                key={q._id}
                                className={`bg-white rounded-3xl border shadow-sm p-5 sm:p-6 space-y-4 transition-all ${
                                    verified
                                        ? verified.isCorrect
                                            ? 'border-green-200 shadow-green-50'
                                            : 'border-red-200 shadow-red-50'
                                        : 'border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                {/* Badges */}
                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-400">سؤال #{(page - 1) * 20 + idx + 1}</span>
                                        <span className="bg-forest/10 text-forest font-bold px-2.5 py-0.5 rounded-full">
                                            {getSubjectLabel(q.subject)}
                                        </span>
                                        <span className={`font-bold px-2.5 py-0.5 rounded-full ${diffInfo.color}`}>
                                            {diffInfo.label}
                                        </span>
                                        <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">
                                            {q.type === 'essay' ? '✍️ مقالي' : q.type === 'true_false' ? '✅ صح/خطأ' : '🔘 اختيار متعدد'}
                                        </span>
                                        {q.isSolved && (
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                ✓ تم حله سابقاً
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold text-forest text-xs">
                                        {q.points} {q.points === 1 ? 'درجة' : 'درجات'}
                                    </span>
                                </div>

                                {/* Text */}
                                <h3 className="font-bold text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                                    {q.text}
                                </h3>

                                {q.image && (
                                    <img src={q.image} alt="صورة السؤال" className="max-h-48 rounded-2xl border border-gray-200" />
                                )}

                                {/* Choices for MCQ / True-False */}
                                {q.type !== 'essay' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {q.choices?.map((c, ci) => {
                                            const isSelected = inlineAnswers[q._id] === ci;
                                            let choiceStyle = 'border-gray-200 bg-gray-50/70 hover:border-forest/50 text-gray-800';

                                            if (verified) {
                                                if (ci === verified.correctChoiceIndex) {
                                                    choiceStyle = 'border-green-400 bg-green-50 text-green-900 font-bold ring-1 ring-green-400';
                                                } else if (isSelected && !verified.isCorrect) {
                                                    choiceStyle = 'border-red-400 bg-red-50 text-red-900 font-bold line-through';
                                                }
                                            } else if (isSelected) {
                                                choiceStyle = 'border-forest bg-forest/10 text-forest font-bold ring-1 ring-forest';
                                            }

                                            return (
                                                <button
                                                    key={ci}
                                                    type="button"
                                                    disabled={Boolean(verified)}
                                                    onClick={() => setInlineAnswers((prev) => ({ ...prev, [q._id]: ci }))}
                                                    className={`text-right p-3 rounded-2xl border-2 transition-all flex items-center justify-between text-xs sm:text-sm ${choiceStyle}`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 bg-white">
                                                            {['أ', 'ب', 'ج', 'د', 'هـ', 'و'][ci] || ci + 1}
                                                        </span>
                                                        <span>{c.text}</span>
                                                    </div>
                                                    {verified && ci === verified.correctChoiceIndex && (
                                                        <span className="text-green-600 font-bold text-xs">✓ الصحيحة</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Essay answer textarea */}
                                {q.type === 'essay' && (
                                    <div className="space-y-2">
                                        <textarea
                                            rows={3}
                                            value={inlineEssay[q._id] || ''}
                                            onChange={(e) => setInlineEssay((prev) => ({ ...prev, [q._id]: e.target.value }))}
                                            placeholder="اكتب إجابتك هنا للتدريب..."
                                            className="w-full border-2 border-purple-200 rounded-2xl p-3 text-xs leading-relaxed outline-none focus:border-purple-400 bg-purple-50/20 resize-y"
                                            dir="rtl"
                                        />
                                    </div>
                                )}

                                {/* Verification feedback if verified */}
                                {verified && (
                                    <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn">
                                        <div className="font-bold flex items-center gap-2">
                                            <span>💡 النتيجة:</span>
                                            <span className={verified.isCorrect ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                                {verified.isCorrect ? '✓ إجابة صحيحة (+ ' + verified.pointsEarned + ' درجة)' : '✗ إجابة غير صحيحة (الإجابة الصحيحة: ' + verified.correctAnswer + ')'}
                                            </span>
                                        </div>
                                        {verified.modelAnswer && (
                                            <div>
                                                <span className="font-bold block mb-1">الإجابة النموذجية:</span>
                                                <p className="bg-white p-2 rounded-lg border border-blue-200 text-gray-800">{verified.modelAnswer}</p>
                                            </div>
                                        )}
                                        {verified.explanation && (
                                            <div>
                                                <span className="font-bold block mb-1">الشرح والتوضيح:</span>
                                                <p>{verified.explanation}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Check button */}
                                <div className="flex justify-end pt-1">
                                    {!verified ? (
                                        <button
                                            type="button"
                                            onClick={() => handleCheckSingle(q)}
                                            disabled={verifyingId === q._id}
                                            className="btn-primary py-2 px-5 text-xs font-bold disabled:opacity-50"
                                        >
                                            {verifyingId === q._id ? 'جاري التحقق...' : '🔍 تحقق من الإجابة'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInlineResults((prev) => {
                                                    const next = { ...prev };
                                                    delete next[q._id];
                                                    return next;
                                                });
                                            }}
                                            className="btn-secondary py-1.5 px-4 text-xs font-bold"
                                        >
                                            🔄 إعادة المحاولة
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-40"
                    >
                        ← السابق
                    </button>
                    <span className="text-xs font-bold text-gray-500 px-3">
                        صفحة {page} من {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-40"
                    >
                        التالي →
                    </button>
                </div>
            )}
        </div>
    );
}
