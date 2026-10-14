'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSubjectLabel } from '@/lib/constants/subjects';
import { gradeLabel } from '@/lib/constants/grades';
import { ACTIVE_GRADES } from '@/lib/constants/grades';
import { SUBJECTS } from '@/lib/constants/subjects';

interface AffectedStudent {
    _id: string;
    name: string | null;
    grade: string | null;
}

interface MistakeQuestion {
    _id: string;
    text: string;
    subject: string;
    grade: string;
    difficulty: string;
    errorCount: number;
    affectedStudentsCount: number;
    affectedStudents: AffectedStudent[];
}

interface MistakesData {
    topMistakenQuestions: MistakeQuestion[];
    totalMistakesRecorded: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
    easy: { label: 'سهل', color: 'bg-green-100 text-green-700' },
    medium: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-700' },
    hard: { label: 'صعب', color: 'bg-red-100 text-red-700' },
};

export default function AdminStudentMistakesPage() {
    const [data, setData] = useState<MistakesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [grade, setGrade] = useState('');
    const [subject, setSubject] = useState('');
    const [page, setPage] = useState(1);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (grade) params.set('grade', grade);
            if (subject) params.set('subject', subject);
            params.set('page', String(page));
            params.set('limit', '30');

            const res = await fetch(`/api/admin/student-mistakes?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                setError('حدث خطأ أثناء تحميل البيانات');
            }
        } catch {
            setError('فشل الاتصال بالخادم. تحقق من اتصالك وأعد المحاولة.');
        } finally {
            setLoading(false);
        }
    }, [search, grade, subject, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [search, grade, subject]);

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">سجل أخطاء الطلاب</h1>
                <p className="text-gray-500 mt-1">
                    الأسئلة الأكثر خطأً مرتبة حسب عدد المحاولات الخاطئة، مع قائمة الطلاب المتأثرين بكل سؤال
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="🔍 ابحث باسم الطالب..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                        />
                    </div>

                    {/* Grade filter */}
                    <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
                    >
                        <option value="">كل الصفوف</option>
                        {ACTIVE_GRADES.map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>

                    {/* Subject filter */}
                    <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
                    >
                        <option value="">كل المواد</option>
                        {SUBJECTS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>

                    {/* Reset */}
                    {(search || grade || subject) && (
                        <button
                            onClick={() => { setSearch(''); setGrade(''); setSubject(''); }}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            إعادة ضبط
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-gray-400 font-medium">جاري تحميل البيانات...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-red-700 font-bold mb-1">{error}</p>
                    <button
                        onClick={fetchData}
                        className="mt-4 px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            ) : !data || data.topMistakenQuestions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
                    <div className="text-5xl mb-3">📊</div>
                    <p className="text-gray-600 font-bold mb-1">
                        {search || grade || subject
                            ? 'لا توجد نتائج تطابق الفلتر المحدد'
                            : 'لا توجد أخطاء مسجلة بعد'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {search || grade || subject
                            ? 'جرب تغيير معايير البحث أو إعادة الضبط'
                            : 'ستظهر الأخطاء بمجرد إكمال الطلاب لاختباراتهم'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Stats banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-bold text-amber-900">إجمالي الأخطاء المسجلة</h3>
                                <p className="text-xs text-amber-700">مرتبة حسب أكثر الأسئلة التي يخطئ فيها الطلاب</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-amber-900 bg-white px-4 py-1.5 rounded-xl border border-amber-200 shadow-sm">
                                {data.totalMistakesRecorded.toLocaleString('ar-EG')} خطأ
                            </span>
                            {data.totalCount > 0 && (
                                <span className="text-sm font-bold text-amber-800 bg-white px-3 py-1.5 rounded-xl border border-amber-200">
                                    {data.totalCount} سؤال
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Questions list */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <span className="font-bold text-gray-900">
                                الأسئلة الأكثر خطأً
                            </span>
                            <span className="text-sm text-gray-400">
                                الصفحة {data.currentPage} من {data.totalPages}
                            </span>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {data.topMistakenQuestions.map((q, i) => {
                                const rank = (page - 1) * 30 + i + 1;
                                const isExpanded = expandedQuestion === q._id;
                                const diff = DIFFICULTY_MAP[q.difficulty] || { label: q.difficulty, color: 'bg-gray-100 text-gray-600' };

                                return (
                                    <div key={q._id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Badges */}
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="text-gray-400 font-bold text-sm ml-1">#{rank}</span>
                                                    {q.subject && (
                                                        <span className="px-2.5 py-0.5 rounded-lg bg-green-800 text-white text-[11px] font-bold">
                                                            {getSubjectLabel(q.subject)}
                                                        </span>
                                                    )}
                                                    {q.grade && (
                                                        <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold">
                                                            {gradeLabel(q.grade)}
                                                        </span>
                                                    )}
                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${diff.color}`}>
                                                        {diff.label}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-700 text-[11px] font-bold">
                                                        {q.errorCount} خطأ
                                                    </span>
                                                </div>

                                                {/* Question text */}
                                                <p className="font-bold text-gray-900 mb-3 leading-relaxed">{q.text}</p>

                                                {/* Affected students toggle */}
                                                <button
                                                    onClick={() => setExpandedQuestion(isExpanded ? null : q._id)}
                                                    className="flex items-center gap-2 text-xs font-bold text-green-700 hover:text-green-900 transition-colors"
                                                >
                                                    <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[10px] font-black">
                                                        {q.affectedStudentsCount}
                                                    </span>
                                                    {isExpanded ? 'إخفاء' : 'عرض'} الطلاب المتأثرين
                                                    <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                                                </button>

                                                {/* Students list (expanded) */}
                                                {isExpanded && (
                                                    <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                        <p className="text-xs text-gray-500 font-bold mb-2">الطلاب الذين أخطأوا في هذا السؤال:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {q.affectedStudents.map((student) => (
                                                                <div
                                                                    key={student._id}
                                                                    className="flex items-center gap-1.5"
                                                                >
                                                                    {student.name ? (
                                                                        <Link
                                                                            href={`/admin/students?id=${student._id}`}
                                                                            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-green-400 hover:text-green-800 transition-all shadow-sm"
                                                                        >
                                                                            <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[10px] font-black shrink-0">
                                                                                {student.name.charAt(0)}
                                                                            </span>
                                                                            <span>{student.name}</span>
                                                                            {student.grade && (
                                                                                <span className="text-[10px] text-gray-400 font-normal">
                                                                                    ({gradeLabel(student.grade)?.split(' ').slice(-2).join(' ')})
                                                                                </span>
                                                                            )}
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="inline-flex items-center bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 italic">
                                                                            بيانات الطالب غير متاحة
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stats column */}
                                            <div className="text-center shrink-0">
                                                <span className="text-xs text-gray-500 font-bold block">الطلاب المتأثرون</span>
                                                <span className="text-2xl font-black text-green-800">{q.affectedStudentsCount}</span>
                                                <span className="text-xs text-gray-400 block">طالب</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {data.totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    → السابق
                                </button>
                                <span className="text-sm text-gray-500 font-medium">
                                    صفحة {page} من {data.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                    disabled={page === data.totalPages}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← التالي
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
