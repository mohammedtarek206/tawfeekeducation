'use client';

import { useState, useEffect, useCallback } from 'react';
import { SUBJECTS } from '@/lib/constants/subjects';
import { formatDate } from '@/lib/utils/helpers';


interface Choice {
    text: string;
    isCorrect: boolean;
}

interface Mistake {
    questionId: string;
    questionText: string;
    choices: Choice[];
    selectedChoiceIndex: number;
    correctChoiceIndex: number;
    subject: string;
    grade: string;
    difficulty: string;
    examTitle: string;
    examType: string;
    examRef: string;
    attemptId: string;
    submittedAt: string;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
    quiz: 'اختبار حصة',
    weekly_exam: 'اختبار أسبوعي',
    monthly_exam: 'اختبار شهري',
};

const DIFFICULTY_LABELS: Record<string, string> = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
};

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-red-100 text-red-700',
};

function MistakeCard({ mistake, index, practiceMode }: { mistake: Mistake; index: number; practiceMode: boolean }) {
    const [revealed, setRevealed] = useState(false);
    const [practiced, setPracticed] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);

    const selectedText = mistake.choices[mistake.selectedChoiceIndex]?.text || '—';
    const correctText = mistake.choices[mistake.correctChoiceIndex]?.text || '—';

    const handlePracticeAnswer = (idx: number) => {
        if (practiced) return;
        setSelected(idx);
        setPracticed(true);
    };

    const isCorrectPractice = selected === mistake.correctChoiceIndex;

    return (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-red-50 border-b border-red-100">
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-red-600">{mistake.examTitle}</span>
                    <span className="text-xs text-gray-400">←</span>
                    <span className="text-xs text-gray-500">{EXAM_TYPE_LABELS[mistake.examType] || mistake.examType}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[mistake.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                        {DIFFICULTY_LABELS[mistake.difficulty] || mistake.difficulty}
                    </span>
                    <span className="text-xs text-gray-400" suppressHydrationWarning>
                        {mistake.submittedAt ? formatDate(mistake.submittedAt) : ''}
                    </span>

                </div>
            </div>

            {/* Question */}
            <div className="p-5">
                <p className="text-gray-800 font-semibold text-[15px] leading-relaxed mb-4" dir="rtl">
                    {mistake.questionText}
                </p>

                {practiceMode ? (
                    /* Practice Mode: show all choices interactively */
                    <div className="space-y-2 mb-4">
                        {mistake.choices.map((choice, idx) => {
                            let bgClass = 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
                            if (practiced) {
                                if (idx === mistake.correctChoiceIndex) bgClass = 'bg-green-50 border-green-400 text-green-800';
                                else if (idx === selected) bgClass = 'bg-red-50 border-red-400 text-red-700';
                                else bgClass = 'bg-gray-50 border-gray-200 text-gray-400';
                            }
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handlePracticeAnswer(idx)}
                                    disabled={practiced}
                                    className={`w-full text-right px-4 py-3 rounded-xl border text-sm font-medium transition-all ${bgClass} ${practiced ? '' : 'cursor-pointer'}`}
                                    dir="rtl"
                                >
                                    {choice.text}
                                    {practiced && idx === mistake.correctChoiceIndex && (
                                        <span className="mr-2 text-green-600">✓</span>
                                    )}
                                    {practiced && idx === selected && idx !== mistake.correctChoiceIndex && (
                                        <span className="mr-2 text-red-500">✗</span>
                                    )}
                                </button>
                            );
                        })}
                        {practiced && (
                            <p className={`text-sm font-bold mt-2 ${isCorrectPractice ? 'text-green-600' : 'text-red-600'}`}>
                                {isCorrectPractice ? '🎉 أحسنت! إجابة صحيحة' : '❌ حاول مرة أخرى في المرة القادمة'}
                            </p>
                        )}
                    </div>
                ) : (
                    /* Review Mode */
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <span className="mt-0.5 text-red-500 flex-shrink-0">✗</span>
                            <div>
                                <div className="text-[11px] text-red-400 font-semibold mb-0.5">إجابتك</div>
                                <div className="text-sm text-red-700 font-medium" dir="rtl">{selectedText}</div>
                            </div>
                        </div>
                        {revealed ? (
                            <div className="flex gap-3 items-start bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                                <div>
                                    <div className="text-[11px] text-green-600 font-semibold mb-0.5">الإجابة الصحيحة</div>
                                    <div className="text-sm text-green-800 font-medium" dir="rtl">{correctText}</div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setRevealed(true)}
                                className="w-full py-2 rounded-xl border border-dashed border-green-300 text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors"
                            >
                                👁 اعرض الإجابة الصحيحة
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MistakesPage() {
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [subject, setSubject] = useState('');
    const [examType, setExamType] = useState('');
    const [practiceMode, setPracticeMode] = useState(false);

    const fetchMistakes = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(page), limit: '12' });
            if (subject) params.set('subject', subject);
            if (examType) params.set('examType', examType);
            const res = await fetch(`/api/student/mistakes?${params}`);
            if (!res.ok) throw new Error('فشل تحميل الأخطاء');
            const json = await res.json();
            setMistakes(json.data?.mistakes || []);
            setTotal(json.data?.total || 0);
            setPages(json.data?.pages || 1);
        } catch {
            setError('حدث خطأ أثناء تحميل الأخطاء');
        } finally {
            setLoading(false);
        }
    }, [page, subject, examType]);

    useEffect(() => {
        fetchMistakes();
    }, [fetchMistakes]);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchMistakes();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">أخطائي 📋</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        راجع إجاباتك الخاطئة وتدرب عليها لتتحسن
                    </p>
                </div>
                {total > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{total} خطأ مسجّل</span>
                        <button
                            onClick={() => setPracticeMode(!practiceMode)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${practiceMode
                                ? 'bg-forest text-white shadow-md'
                                : 'bg-forest/10 text-forest hover:bg-forest/20'
                                }`}
                        >
                            {practiceMode ? '👁 وضع المراجعة' : '🎯 وضع التدريب'}
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <form onSubmit={handleFilter} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">المادة</label>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-forest"
                        >
                            <option value="">كل المواد</option>
                            {SUBJECTS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">نوع الاختبار</label>
                        <select
                            value={examType}
                            onChange={(e) => setExamType(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-forest"
                        >
                            <option value="">كل الأنواع</option>
                            <option value="quiz">اختبار حصة</option>
                            <option value="weekly_exam">أسبوعي</option>
                            <option value="monthly_exam">شهري</option>
                        </select>
                    </div>
                    <button type="submit" className="px-5 py-2 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest/90 transition-colors">
                        🔍 فلتر
                    </button>
                    {(subject || examType) && (
                        <button
                            type="button"
                            onClick={() => { setSubject(''); setExamType(''); setPage(1); }}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-forest transition-colors"
                        >
                            مسح
                        </button>
                    )}
                </div>
            </form>

            {/* Practice Mode Banner */}
            {practiceMode && (
                <div className="bg-forest/10 border border-forest/20 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                        <div className="font-bold text-forest text-sm">وضع التدريب مُفعَّل</div>
                        <div className="text-xs text-forest/70">اختر الإجابة الصحيحة — التدريب لا يغير نتائجك الأصلية</div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-16 text-red-500">{error}</div>
            ) : mistakes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-xl font-black text-gray-700 mb-2">لا توجد أخطاء!</h3>
                    <p className="text-gray-400 text-sm">
                        {subject || examType ? 'لا توجد أخطاء بهذه الفلاتر' : 'أداؤك ممتاز — حل المزيد من الاختبارات لتظهر هنا'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {mistakes.map((mistake, idx) => (
                            <MistakeCard
                                key={`${mistake.questionId}-${mistake.attemptId}`}
                                mistake={mistake}
                                index={(page - 1) * 12 + idx}
                                practiceMode={practiceMode}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pages > 1 && (
                        <div className="flex justify-center gap-2 pt-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-xl border text-sm font-semibold disabled:opacity-40 hover:bg-gray-50 transition-colors"
                            >
                                → السابق
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-600 font-medium">
                                {page} / {pages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                disabled={page === pages}
                                className="px-4 py-2 rounded-xl border text-sm font-semibold disabled:opacity-40 hover:bg-gray-50 transition-colors"
                            >
                                ← التالي
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
