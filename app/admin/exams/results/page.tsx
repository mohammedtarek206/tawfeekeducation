'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';
import { getSubjectLabel } from '@/lib/constants/subjects';

interface AttemptRecord {
    _id: string;
    student?: {
        _id: string;
        name: string;
        phone: string;
        grade: string;
    };
    examRef?: {
        _id: string;
        title: string;
        type: string;
        subject: string;
        passingScore: number;
        totalPoints: number;
    };
    examType: string;
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    hasUngradedEssays: boolean;
    submittedAt?: string;
    timeSpent?: number;
}

interface AttemptDetail extends AttemptRecord {
    answers: Array<{
        questionId: string;
        questionText: string;
        questionType: 'mcq' | 'true_false' | 'essay';
        choices?: Array<{ text: string; isCorrect: boolean }>;
        selectedChoiceIndex: number;
        isCorrect: boolean;
        pointsEarned: number;
        maxPoints: number;
        essayAnswer?: string;
        gradingStatus?: 'pending' | 'graded';
        gradedBy?: string;
        gradedAt?: string;
        gradingNotes?: string;
        modelAnswer?: string;
        gradingCriteria?: string;
        explanation?: string;
        image?: string;
    }>;
}

interface ResultStats {
    totalAttempts: number;
    uniqueStudents: number;
    completedAttempts: number;
    pendingEssays: number;
    avgPercentage: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
    quiz: { label: 'كويز حصة', color: 'bg-blue-100 text-blue-700' },
    weekly_exam: { label: 'أسبوعي', color: 'bg-purple-100 text-purple-700' },
    monthly_exam: { label: 'شهري', color: 'bg-orange-100 text-orange-700' },
    practice: { label: 'تدريب بنك', color: 'bg-teal-100 text-teal-700' },
};

export default function AdminExamResultsPage() {
    // List & Stats
    const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
    const [stats, setStats] = useState<ResultStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [search, setSearch] = useState('');
    const [grade, setGrade] = useState('');
    const [examId, setExamId] = useState('');
    const [examType, setExamType] = useState('exams_only'); // exams_only | all | quiz | weekly_exam | monthly_exam | practice
    const [gradingStatus, setGradingStatus] = useState(''); // all | graded | pending
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Available Exams dropdown
    const [availableExams, setAvailableExams] = useState<any[]>([]);

    // Detail & Grading Modal state
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
    const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [gradingInput, setGradingInput] = useState<Record<string, { points: string; notes: string }>>({});
    const [savingGrade, setSavingGrade] = useState<Record<string, boolean>>({});
    const [gradeSuccess, setGradeSuccess] = useState('');
    const [gradeError, setGradeError] = useState('');

    // Load available exams for dropdown
    useEffect(() => {
        fetch('/api/admin/exams')
            .then((r) => r.json())
            .then((res) => {
                if (res.success && Array.isArray(res.data?.exams)) {
                    setAvailableExams(res.data.exams);
                }
            })
            .catch(() => {});
    }, []);

    // Load results list
    const loadResults = useCallback(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
            page: String(page),
            limit: '20',
        });
        if (search.trim()) params.set('search', search.trim());
        if (grade) params.set('grade', grade);
        if (examId) params.set('examId', examId);
        if (examType) params.set('examType', examType);
        if (gradingStatus) params.set('gradingStatus', gradingStatus);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        fetch(`/api/admin/exams/results?${params.toString()}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setAttempts(res.data.attempts || []);
                    setStats(res.data.stats || null);
                    setTotalPages(res.data.pages || 1);
                } else {
                    setError(res.message || 'فشل في تحميل نتائج الامتحانات');
                }
            })
            .catch(() => setError('فشل الاتصال بالخادم'))
            .finally(() => setLoading(false));
    }, [page, search, grade, examId, examType, gradingStatus, startDate, endDate]);

    useEffect(() => {
        loadResults();
    }, [loadResults]);

    // Open detail modal
    const openAttemptDetail = async (id: string) => {
        setSelectedAttemptId(id);
        setLoadingDetail(true);
        setGradeSuccess('');
        setGradeError('');
        try {
            const res = await fetch(`/api/admin/exams/results/${id}`);
            const data = await res.json();
            if (data.success) {
                setAttemptDetail(data.data.attempt);
                // Pre-fill grading inputs
                const initGrading: Record<string, { points: string; notes: string }> = {};
                (data.data.attempt.answers || []).forEach((a: any) => {
                    if (a.questionType === 'essay') {
                        initGrading[a.questionId] = {
                            points: a.pointsEarned !== undefined ? String(a.pointsEarned) : '0',
                            notes: a.gradingNotes || '',
                        };
                    }
                });
                setGradingInput(initGrading);
            } else {
                setGradeError(data.message || 'فشل في جلب تفاصيل المحاولة');
            }
        } catch {
            setGradeError('خطأ في الاتصال بالخادم');
        } finally {
            setLoadingDetail(false);
        }
    };

    // Submit grade for essay question
    const handleGradeEssay = async (questionId: string, maxPoints: number) => {
        if (!selectedAttemptId) return;
        const state = gradingInput[questionId] || { points: '0', notes: '' };
        const pts = parseFloat(state.points);

        if (isNaN(pts) || pts < 0) {
            setGradeError('يرجى إدخال درجة صالحة (صفر أو أكثر)');
            return;
        }
        if (pts > maxPoints) {
            setGradeError(`الدرجة المدخلة (${pts}) تتجاوز الحد الأقصى للسؤال (${maxPoints})`);
            return;
        }

        setSavingGrade((prev) => ({ ...prev, [questionId]: true }));
        setGradeError('');
        setGradeSuccess('');

        try {
            const res = await fetch(`/api/admin/exams/results/${selectedAttemptId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId,
                    pointsEarned: pts,
                    gradingNotes: state.notes,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setGradeSuccess('تم حفظ درجة السؤال المقالي وتحديث النتيجة بنجاح ✅');
                // Refresh modal details & parent table
                openAttemptDetail(selectedAttemptId);
                loadResults();
                setTimeout(() => setGradeSuccess(''), 3000);
            } else {
                setGradeError(data.message || 'فشل في حفظ التصحيح');
            }
        } catch {
            setGradeError('خطأ في الاتصال');
        } finally {
            setSavingGrade((prev) => ({ ...prev, [questionId]: false }));
        }
    };

    // Download CSV export
    const handleExport = () => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (grade) params.set('grade', grade);
        if (examId) params.set('examId', examId);
        if (examType) params.set('examType', examType);
        if (gradingStatus) params.set('gradingStatus', gradingStatus);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        window.open(`/api/admin/exams/results/export?${params.toString()}`, '_blank');
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/admin/exams" className="text-xs text-forest font-bold hover:underline">
                            ↩ الامتحانات والكويزات
                        </Link>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">نتائج وتصحيح الامتحانات 📊</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        سجل كامل لجميع محاولات الطلاب مع تفاصيل الإجابات وتصحيح الأسئلة المقالية وإحصائيات الأداء.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-1.5 font-bold"
                    >
                        📥 تصدير Excel / CSV
                    </button>
                </div>
            </div>

            {/* Stat Summary Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                        <div className="text-2xl font-black text-gray-900">{stats.totalAttempts}</div>
                        <div className="text-xs text-gray-500 font-bold mt-1">إجمالي المحاولات</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                        <div className="text-2xl font-black text-blue-600">{stats.uniqueStudents}</div>
                        <div className="text-xs text-gray-500 font-bold mt-1">الطلاب المشاركون</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                        <div className="text-2xl font-black text-forest">{stats.avgPercentage}%</div>
                        <div className="text-xs text-gray-500 font-bold mt-1">متوسط الدرجات</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                        <div className="text-2xl font-black text-green-600">{stats.completedAttempts}</div>
                        <div className="text-xs text-gray-500 font-bold mt-1">محاولات مكتملة</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-orange-200 bg-orange-50/50 shadow-sm p-4 text-center">
                        <div className="text-2xl font-black text-orange-600">{stats.pendingEssays}</div>
                        <div className="text-xs text-orange-700 font-bold mt-1">⏳ بانتظار تصحيح مقالي</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                        <div className="text-2xl font-black text-purple-600">
                            {stats.maxScore} <span className="text-xs text-gray-400 font-normal">/ {stats.minScore}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-bold mt-1">أعلى / أقل درجة</div>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* Student Search */}
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="🔍 بحث باسم الطالب أو الهاتف..."
                            className="input-field bg-gray-50 text-xs w-full"
                        />
                    </div>

                    {/* Grade Filter */}
                    <div>
                        <select
                            value={grade}
                            onChange={(e) => { setGrade(e.target.value); setPage(1); }}
                            className="input-field bg-gray-50 text-xs"
                        >
                            <option value="">كل الصفوف الدراسية</option>
                            {ACTIVE_GRADES.map((g) => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Exam Filter */}
                    <div>
                        <select
                            value={examId}
                            onChange={(e) => { setExamId(e.target.value); setPage(1); }}
                            className="input-field bg-gray-50 text-xs"
                        >
                            <option value="">كل الامتحانات</option>
                            {availableExams.map((ex) => (
                                <option key={ex._id} value={ex._id}>{ex.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <select
                            value={examType}
                            onChange={(e) => { setExamType(e.target.value); setPage(1); }}
                            className="input-field bg-gray-50 text-xs"
                        >
                            <option value="exams_only">الامتحانات الرسمية فقط</option>
                            <option value="all">كل المحاولات (مع التدريب)</option>
                            <option value="weekly_exam">الاختبارات الأسبوعية</option>
                            <option value="monthly_exam">الاختبارات الشهرية</option>
                            <option value="quiz">كويزات الحصص</option>
                            <option value="practice">تدريب بنك الأسئلة</option>
                        </select>
                    </div>

                    {/* Correction Status */}
                    <div>
                        <select
                            value={gradingStatus}
                            onChange={(e) => { setGradingStatus(e.target.value); setPage(1); }}
                            className="input-field bg-gray-50 text-xs"
                        >
                            <option value="">كل حالات التصحيح</option>
                            <option value="pending">⏳ بانتظار تصحيح المقالي</option>
                            <option value="graded">✅ مكتمل ومصحح</option>
                        </select>
                    </div>
                </div>

                {/* Date range row */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap text-xs">
                    <span className="text-gray-500 font-bold">الفترة الزمنية:</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">من:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">إلى:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                        />
                    </div>
                    {(search || grade || examId || examType !== 'exams_only' || gradingStatus || startDate || endDate) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setGrade('');
                                setExamId('');
                                setExamType('exams_only');
                                setGradingStatus('');
                                setStartDate('');
                                setEndDate('');
                                setPage(1);
                            }}
                            className="text-red-500 hover:underline font-bold mr-auto"
                        >
                            ✕ إعادة تعيين الفلاتر
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-bold text-sm">
                    {error}
                </div>
            )}

            {/* Results Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                            <tr>
                                <th className="p-3.5">الطالب</th>
                                <th className="p-3.5">الصف</th>
                                <th className="p-3.5">الامتحان / الاختبار</th>
                                <th className="p-3.5">تاريخ التسليم</th>
                                <th className="p-3.5 text-center">الدرجة</th>
                                <th className="p-3.5 text-center">النسبة</th>
                                <th className="p-3.5 text-center">حالة النتيجة</th>
                                <th className="p-3.5 text-center">حالة التصحيح</th>
                                <th className="p-3.5 text-center">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-gray-400 animate-pulse">
                                        جاري تحميل النتائج...
                                    </td>
                                </tr>
                            ) : attempts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-gray-400">
                                        لا توجد نتائج مسجلة مطابقة للبحث والفلاتر
                                    </td>
                                </tr>
                            ) : (
                                attempts.map((a) => {
                                    const typeInfo = TYPE_BADGES[a.examType] || { label: a.examType, color: 'bg-gray-100 text-gray-600' };
                                    const isPending = a.hasUngradedEssays;

                                    return (
                                        <tr key={a._id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="p-3.5">
                                                <div className="font-bold text-gray-900 text-sm">
                                                    {a.student?.name || 'غير معروف'}
                                                </div>
                                                <div className="text-[11px] text-gray-400 font-mono">
                                                    {a.student?.phone || 'بدون هاتف'}
                                                </div>
                                            </td>

                                            <td className="p-3.5 whitespace-nowrap text-gray-600">
                                                {gradeLabel(a.student?.grade)}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-bold text-gray-800">
                                                    {a.examRef?.title || (a.examType === 'practice' ? 'جلسة تدريب بنك الأسئلة' : 'اختبار')}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeInfo.color}`}>
                                                        {typeInfo.label}
                                                    </span>
                                                    {a.examRef?.subject && (
                                                        <span className="text-[10px] text-gray-400">
                                                            · {getSubjectLabel(a.examRef.subject)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-3.5 whitespace-nowrap text-gray-500">
                                                {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('ar-EG', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                }) : '—'}
                                            </td>

                                            <td className="p-3.5 text-center font-black text-sm">
                                                {a.score} <span className="text-gray-400 font-normal text-xs">/ {a.totalPoints}</span>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-xs font-black inline-block ${
                                                        isPending
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : a.passed
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {a.percentage}%
                                                </span>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                {isPending ? (
                                                    <span className="text-amber-700 font-bold text-xs">معلق</span>
                                                ) : a.passed ? (
                                                    <span className="text-green-600 font-bold text-xs">✓ ناجح</span>
                                                ) : (
                                                    <span className="text-red-600 font-bold text-xs">✗ راسب</span>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-center whitespace-nowrap">
                                                {isPending ? (
                                                    <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                                                        <span>⏳</span> بانتظار تصحيح
                                                    </span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-bold text-[11px]">
                                                        ✓ مكتمل
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <button
                                                    onClick={() => openAttemptDetail(a._id)}
                                                    className="btn-secondary py-1.5 px-3 text-xs font-bold text-forest hover:bg-forest/10"
                                                >
                                                    {isPending ? '✍️ تصحيح وعرض' : '🔍 التفاصيل'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500 font-bold">
                            صفحة {page} من {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn-secondary px-3 py-1.5 disabled:opacity-40"
                            >
                                ← السابق
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="btn-secondary px-3 py-1.5 disabled:opacity-40"
                            >
                                التالي →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* DETAIL & GRADING MODAL                                            */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {selectedAttemptId && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-4xl w-full p-6 sm:p-8 space-y-6 my-auto max-h-[92vh] overflow-y-auto animate-fadeIn">
                        {loadingDetail ? (
                            <div className="text-center py-20 text-gray-400 animate-pulse font-bold">
                                جاري تحميل تفاصيل المحاولة وإجابات الطالب...
                            </div>
                        ) : attemptDetail ? (
                            <div className="space-y-6">
                                {/* Modal Header */}
                                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs bg-forest/10 text-forest px-2.5 py-0.5 rounded-full font-bold">
                                                {attemptDetail.examRef?.title || 'جلسة تدريب'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {attemptDetail.submittedAt ? new Date(attemptDetail.submittedAt).toLocaleString('ar-EG') : ''}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black text-gray-900">
                                            إجابات الطالب: {attemptDetail.student?.name}
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            الهاتف: {attemptDetail.student?.phone} · الصف: {gradeLabel(attemptDetail.student?.grade)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-gray-900">
                                                {attemptDetail.score} / {attemptDetail.totalPoints}
                                            </div>
                                            <div className="text-xs font-bold text-forest">
                                                {attemptDetail.percentage}% · {attemptDetail.passed ? 'ناجح' : 'راسب'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedAttemptId(null); setAttemptDetail(null); }}
                                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {gradeSuccess && (
                                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-xs font-bold">
                                        {gradeSuccess}
                                    </div>
                                )}
                                {gradeError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-bold">
                                        {gradeError}
                                    </div>
                                )}

                                {/* Questions and answers list */}
                                <div className="space-y-5 divide-y divide-gray-100">
                                    {attemptDetail.answers?.map((ans, idx) => {
                                        const isEssay = ans.questionType === 'essay';
                                        const inputState = gradingInput[ans.questionId] || {
                                            points: String(ans.pointsEarned || 0),
                                            notes: ans.gradingNotes || '',
                                        };

                                        return (
                                            <div key={ans.questionId} className="pt-5 space-y-3">
                                                {/* Question header */}
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-400">#{idx + 1}</span>
                                                        <span className={`px-2 py-0.5 rounded font-bold ${
                                                            isEssay ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {isEssay ? '✍️ سؤال مقالي' : '🔘 اختيار من متعدد'}
                                                        </span>
                                                        {!isEssay && (
                                                            <span className={`font-bold px-2 py-0.5 rounded ${
                                                                ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {ans.isCorrect ? '✓ صحيح' : '✗ خطأ'}
                                                            </span>
                                                        )}
                                                        {isEssay && (
                                                            <span className={`font-bold px-2 py-0.5 rounded ${
                                                                ans.gradingStatus === 'graded'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                                {ans.gradingStatus === 'graded' ? '✓ تم تصحيحه' : '⏳ بانتظار التصحيح'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="font-bold text-gray-700">
                                                        الدرجة: {ans.pointsEarned} / {ans.maxPoints}
                                                    </span>
                                                </div>

                                                {/* Question text */}
                                                <h4 className="font-bold text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {ans.questionText}
                                                </h4>

                                                {ans.image && (
                                                    <img src={ans.image} alt="صورة السؤال" className="max-h-36 rounded-xl border border-gray-200" />
                                                )}

                                                {/* MCQ Choices comparison */}
                                                {!isEssay && ans.choices && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                        {ans.choices.map((c, ci) => {
                                                            const isStudentPick = ans.selectedChoiceIndex === ci;
                                                            const isCorrectChoice = c.isCorrect;
                                                            let style = 'bg-gray-50 border-gray-200 text-gray-600';
                                                            if (isCorrectChoice) style = 'bg-green-50 border-green-300 text-green-900 font-bold';
                                                            if (isStudentPick && !isCorrectChoice) style = 'bg-red-50 border-red-300 text-red-900 font-bold line-through';

                                                            return (
                                                                <div key={ci} className={`p-2.5 rounded-xl border flex items-center justify-between ${style}`}>
                                                                    <span>{c.text}</span>
                                                                    {isCorrectChoice && <span className="text-green-600 text-xs font-bold">✓ الصحيحة</span>}
                                                                    {isStudentPick && !isCorrectChoice && <span className="text-red-600 text-xs font-bold">إجابة الطالب</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Essay Student Answer & Grading Section */}
                                                {isEssay && (
                                                    <div className="space-y-3 bg-purple-50/40 border border-purple-200 rounded-2xl p-4">
                                                        <div>
                                                            <span className="font-bold text-xs text-purple-900 block mb-1">
                                                                إجابة الطالب المكتوبة:
                                                            </span>
                                                            <div className="bg-white p-3 rounded-xl border border-purple-100 text-gray-800 text-xs leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                                                {ans.essayAnswer || <span className="text-gray-400 italic">لم يكتب الطالب إجابة</span>}
                                                            </div>
                                                        </div>

                                                        {ans.modelAnswer && (
                                                            <div>
                                                                <span className="font-bold text-xs text-purple-900 block mb-1">
                                                                    الإجابة النموذجية (المرجع):
                                                                </span>
                                                                <p className="bg-white p-2.5 rounded-xl border border-purple-200 text-purple-900 font-bold text-xs">
                                                                    {ans.modelAnswer}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {ans.gradingCriteria && (
                                                            <div className="text-[11px] text-purple-700 font-medium">
                                                                <strong>معايير التصحيح:</strong> {ans.gradingCriteria}
                                                            </div>
                                                        )}

                                                        {/* Inline Grading Form */}
                                                        <div className="pt-2 border-t border-purple-200/60 flex flex-wrap items-center gap-3 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-700">الدرجة الممنوحة:</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={ans.maxPoints}
                                                                    step={0.5}
                                                                    value={inputState.points}
                                                                    onChange={(e) =>
                                                                        setGradingInput((prev) => ({
                                                                            ...prev,
                                                                            [ans.questionId]: { ...prev[ans.questionId], points: e.target.value },
                                                                        }))
                                                                    }
                                                                    className="w-16 text-center border border-purple-300 rounded-lg p-1 font-bold text-purple-900 bg-white"
                                                                />
                                                                <span className="text-gray-400">من {ans.maxPoints}</span>
                                                            </div>

                                                            <div className="flex-1 min-w-[200px]">
                                                                <input
                                                                    type="text"
                                                                    value={inputState.notes}
                                                                    onChange={(e) =>
                                                                        setGradingInput((prev) => ({
                                                                            ...prev,
                                                                            [ans.questionId]: { ...prev[ans.questionId], notes: e.target.value },
                                                                        }))
                                                                    }
                                                                    placeholder="ملاحظات المصحح للطالب (اختياري)..."
                                                                    className="w-full border border-purple-200 rounded-lg p-1.5 text-xs bg-white"
                                                                />
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleGradeEssay(ans.questionId, ans.maxPoints)}
                                                                disabled={savingGrade[ans.questionId]}
                                                                className="btn-primary py-1.5 px-4 text-xs font-bold shrink-0 disabled:opacity-50"
                                                            >
                                                                {savingGrade[ans.questionId] ? 'جاري الحفظ...' : '✓ حفظ الدرجة'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {ans.explanation && (
                                                    <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg">
                                                        <strong>شرح الإجابة:</strong> {ans.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={() => { setSelectedAttemptId(null); setAttemptDetail(null); }}
                                        className="btn-secondary px-6 py-2 text-xs font-bold"
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
