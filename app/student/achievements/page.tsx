'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentAchievementsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

    useEffect(() => {
        fetch('/api/student/achievements')
            .then(r => r.json())
            .then(res => { if (res.success) setData(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center py-10 text-red-500">خطأ في جلب البيانات</div>;

    const { achievements, summary } = data;

    const filtered = achievements.filter((a: any) => {
        if (filter === 'earned') return a.isEarned;
        if (filter === 'locked') return !a.isEarned;
        return true;
    });

    const CATEGORY_LABELS: Record<string, string> = {
        lessons: '📚 الدروس',
        exams: '📝 الاختبارات',
        streak: '🔥 الانتظام',
        points: '🪙 النقاط',
        general: '🎯 المهام',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">🏆 الأوسمة والإنجازات</h1>
                    <p className="text-gray-500 text-sm mt-1">تتبع تقدمك واكسب الأوسمة بإتمام التحديات</p>
                </div>
                <Link href="/student/dashboard" className="text-forest text-sm font-semibold hover:underline">
                    ← العودة للوحة التحكم
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                    <div className="text-3xl font-black text-amber-600">{summary.earned}</div>
                    <div className="text-sm text-gray-500 font-bold mt-1">وسام مكتسب</div>
                </div>
                <div className="card text-center">
                    <div className="text-3xl font-black text-gray-400">{summary.total - summary.earned}</div>
                    <div className="text-sm text-gray-500 font-bold mt-1">وسام لم يُحصل عليه</div>
                </div>
                <div className="card text-center">
                    <div className="text-3xl font-black text-forest">{summary.totalPoints}</div>
                    <div className="text-sm text-gray-500 font-bold mt-1">نقاط من الأوسمة</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-1">
                {(['all', 'earned', 'locked'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${filter === f ? 'bg-forest text-white' : 'text-gray-500 hover:text-forest hover:bg-forest/10'}`}
                    >
                        {f === 'all' ? `الكل (${achievements.length})` : f === 'earned' ? `مكتسبة (${summary.earned})` : `مقفلة (${summary.total - summary.earned})`}
                    </button>
                ))}
            </div>

            {/* Achievement Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-5xl mb-4">🌱</div>
                    <p className="text-gray-500 font-bold">لا توجد إنجازات في هذا التصنيف</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((ach: any) => (
                        <div
                            key={ach._id}
                            className={`relative rounded-2xl border p-5 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-md ${ach.isEarned
                                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-sm'
                                : 'bg-gray-50 border-gray-200 opacity-70 grayscale'
                                }`}
                        >
                            {ach.isEarned && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    ✓ مكتسب
                                </div>
                            )}
                            <div
                                className="text-4xl mb-3"
                                suppressHydrationWarning
                                style={{
                                    filter: ach.isEarned
                                        ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                                        : 'grayscale(1)',
                                }}
                            >
                                {ach.icon || '🏆'}
                            </div>
                            <h3 className="font-black text-sm text-gray-900 mb-1">{ach.title}</h3>
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ach.description}</p>

                            {/* Category Badge */}
                            <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 font-bold text-gray-600 mb-3">
                                {CATEGORY_LABELS[ach.category] || ach.category}
                            </span>

                            {/* Points */}
                            {ach.pointsReward > 0 && (
                                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-3">
                                    +{ach.pointsReward} نقطة
                                </span>
                            )}

                            {/* Progress Bar (for unearned) */}
                            {!ach.isEarned && (
                                <div className="w-full">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>التقدم</span>
                                        <span>{ach.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-forest h-full rounded-full transition-all duration-700"
                                            style={{ width: `${ach.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        المطلوب: {ach.requiredCount} {CATEGORY_LABELS[ach.category]?.split(' ')[1] || ''}
                                    </p>
                                </div>
                            )}

                            {/* Earned At */}
                            {ach.isEarned && ach.earnedAt && (
                                <p className="text-xs text-amber-600 font-bold mt-1">
                                    📅 {new Date(ach.earnedAt).toLocaleDateString('ar-EG')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
