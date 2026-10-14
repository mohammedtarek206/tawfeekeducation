'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ACTIVE_GRADES } from '@/lib/constants/grades';
import { gradeLabel } from '@/lib/constants/grades';

interface LeaderboardEntry {
    rank: number;
    studentId: string;
    name: string;
    grade: string;
    examCount: number;
    totalScore: number;
    totalPoints: number;
    avgPercentage: number;
    lastSubmittedAt: string | null;
}

interface HonorStats {
    totalRankedStudents: number;
    topStudentName: string | null;
    highestAvgPercentage: number | null;
    lastUpdated: string;
}

interface HonorBoardData {
    leaderboard: LeaderboardEntry[];
    stats: HonorStats;
}

const LIMIT_OPTIONS = [10, 20, 50];

const RANK_STYLES: Record<number, { bg: string; border: string; badge: string; icon: string }> = {
    1: { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-400 text-white', icon: '🥇' },
    2: { bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-400 text-white', icon: '🥈' },
    3: { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-400 text-white', icon: '🥉' },
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HonorBoardPage() {
    const [data, setData] = useState<HonorBoardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [grade, setGrade] = useState('');
    const [limit, setLimit] = useState(10);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (grade) params.set('grade', grade);
            params.set('limit', String(limit));

            const res = await fetch(`/api/admin/honor-board?${params.toString()}`);
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
    }, [grade, limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderStars = (percentage: number) => {
        if (percentage >= 90) return '⭐⭐⭐';
        if (percentage >= 75) return '⭐⭐';
        if (percentage >= 60) return '⭐';
        return '';
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span>🏆</span> لوحة الشرف
                    </h1>
                    <p className="text-gray-500 mt-1">
                        الطلاب الأوائل مرتبون حسب متوسط نسبتهم المئوية في الامتحانات المكتملة
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-xl text-sm font-bold hover:bg-green-900 disabled:opacity-60 transition-colors shadow-sm"
                >
                    <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
                    تحديث النتائج
                </button>
            </div>

            {/* Stats cards */}
            {data && !loading && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-2xl font-black text-gray-900">{data.stats.totalRankedStudents}</div>
                        <div className="text-sm text-gray-500 mt-0.5">طالب مؤهل للترتيب</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 bg-amber-50/30">
                        <div className="text-3xl mb-2">🥇</div>
                        <div className="text-lg font-black text-amber-800 truncate">
                            {data.stats.topStudentName || '—'}
                        </div>
                        <div className="text-sm text-amber-600 mt-0.5">الطالب الأول</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="text-3xl mb-2">📈</div>
                        <div className="text-2xl font-black text-green-800">
                            {data.stats.highestAvgPercentage !== null
                                ? `${data.stats.highestAvgPercentage.toFixed(1)}%`
                                : '—'}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">أعلى متوسط نسبة</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="text-3xl mb-2">🕐</div>
                        <div className="text-sm font-bold text-gray-700 mt-1">
                            {formatDate(data.stats.lastUpdated)}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">آخر نتيجة مُحتسبة</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-600">الصف:</span>
                        <select
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
                        >
                            <option value="">كل الصفوف</option>
                            {ACTIVE_GRADES.map((g) => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-600">عرض أفضل:</span>
                        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                            {LIMIT_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setLimit(n)}
                                    className={`px-4 py-2 text-sm font-bold transition-colors ${limit === n
                                            ? 'bg-green-800 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 mr-auto">
                        الترتيب يعتمد على متوسط النسبة المئوية عبر جميع الامتحانات المكتملة
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-gray-400 font-medium">جاري تحميل لوحة الشرف...</p>
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
            ) : !data || data.leaderboard.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
                    <div className="text-5xl mb-3">🏆</div>
                    <p className="text-gray-600 font-bold mb-1">
                        {grade ? 'لا يوجد طلاب لهذا الصف بعد' : 'لا توجد نتائج مسجلة بعد'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        ستظهر لوحة الشرف بمجرد إكمال الطلاب لامتحاناتهم
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Top 3 podium (if we have them) */}
                    {data.leaderboard.filter(e => e.rank <= 3).length >= 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map((rankNum) => {
                                const entry = data.leaderboard.find(e => e.rank === rankNum);
                                if (!entry) return null;
                                const style = RANK_STYLES[rankNum];
                                return (
                                    <div
                                        key={entry.studentId}
                                        className={`rounded-2xl border-2 ${style.bg} ${style.border} p-5 text-center transition-all hover:shadow-md`}
                                    >
                                        <div className="text-4xl mb-2">{style.icon}</div>
                                        <Link
                                            href={`/admin/students?id=${entry.studentId}`}
                                            className="font-black text-gray-900 text-lg hover:text-green-800 transition-colors block truncate"
                                        >
                                            {entry.name}
                                        </Link>
                                        <div className="text-sm text-gray-500 mt-1">{gradeLabel(entry.grade) || '—'}</div>
                                        <div className="mt-3 flex justify-center items-center gap-2">
                                            <span className={`text-2xl font-black ${rankNum === 1 ? 'text-amber-600' : rankNum === 2 ? 'text-gray-600' : 'text-orange-600'}`}>
                                                {entry.avgPercentage.toFixed(1)}%
                                            </span>
                                            <span className="text-sm">{renderStars(entry.avgPercentage)}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">{entry.examCount} امتحان</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900 flex items-center gap-2">
                            <span>📋</span> الترتيب الكامل
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                                        <th className="px-4 py-3 text-right">المركز</th>
                                        <th className="px-4 py-3 text-right">الطالب</th>
                                        <th className="px-4 py-3 text-right">الصف</th>
                                        <th className="px-4 py-3 text-center">متوسط النسبة</th>
                                        <th className="px-4 py-3 text-center">عدد الامتحانات</th>
                                        <th className="px-4 py-3 text-center">إجمالي الدرجات</th>
                                        <th className="px-4 py-3 text-center">آخر نتيجة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.leaderboard.map((entry) => {
                                        const topStyle = RANK_STYLES[entry.rank];
                                        return (
                                            <tr
                                                key={entry.studentId}
                                                className={`hover:bg-gray-50/50 transition-colors ${entry.rank <= 3 ? (topStyle?.bg || '') : ''}`}
                                            >
                                                {/* Rank */}
                                                <td className="px-4 py-3 font-black">
                                                    {entry.rank <= 3 ? (
                                                        <span className="text-xl">{RANK_STYLES[entry.rank]?.icon}</span>
                                                    ) : (
                                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${entry.rank <= 3
                                                                ? RANK_STYLES[entry.rank].badge
                                                                : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {entry.rank}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Name */}
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/admin/students?id=${entry.studentId}`}
                                                        className="font-bold text-gray-900 hover:text-green-800 transition-colors"
                                                    >
                                                        {entry.name}
                                                    </Link>
                                                </td>

                                                {/* Grade */}
                                                <td className="px-4 py-3">
                                                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold whitespace-nowrap">
                                                        {gradeLabel(entry.grade) || '—'}
                                                    </span>
                                                </td>

                                                {/* Avg percentage */}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`font-black text-base ${entry.avgPercentage >= 85
                                                                ? 'text-green-700'
                                                                : entry.avgPercentage >= 60
                                                                    ? 'text-yellow-700'
                                                                    : 'text-red-600'
                                                            }`}>
                                                            {entry.avgPercentage.toFixed(1)}%
                                                        </span>
                                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${entry.avgPercentage >= 85
                                                                        ? 'bg-green-500'
                                                                        : entry.avgPercentage >= 60
                                                                            ? 'bg-yellow-500'
                                                                            : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(100, entry.avgPercentage)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Exam count */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-gray-700">{entry.examCount}</span>
                                                    <span className="text-gray-400 text-xs mr-1">امتحان</span>
                                                </td>

                                                {/* Total score */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-gray-700">{entry.totalScore}</span>
                                                    {entry.totalPoints > 0 && (
                                                        <span className="text-gray-400 text-xs">/{entry.totalPoints}</span>
                                                    )}
                                                </td>

                                                {/* Last exam date */}
                                                <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                    {formatDate(entry.lastSubmittedAt)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                            يشمل الترتيب الطلاب المعتمدين الذين أكملوا امتحانًا واحدًا على الأقل • التعادل يُكسر بإجمالي الدرجات ثم عدد الامتحانات
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
