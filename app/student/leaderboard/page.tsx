'use client';

import { useEffect, useState, useCallback } from 'react';
import { gradeLabel } from '@/lib/constants/grades';

interface LeaderboardEntry {
    rank: number;
    studentId: string;
    name: string;
    avatar: string | null;
    grade: string;
    level: number;
    points: number;
    note?: string;
    isMe: boolean;
}

interface LeaderboardData {
    leaderboard: LeaderboardEntry[];
    totalHonored: number;
    myRank: number | null;
    isInHonorBoard: boolean;
    topStudentName: string | null;
    lastUpdated: string;
}

const PODIUM_CONFIG: Record<
    number,
    {
        bg: string;
        border: string;
        badgeBg: string;
        text: string;
        icon: string;
        title: string;
        ring: string;
        height: string;
    }
> = {
    1: {
        bg: 'bg-gradient-to-b from-amber-50 to-amber-100/60',
        border: 'border-amber-400',
        badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
        text: 'text-amber-800',
        icon: '👑',
        title: 'المركز الأول',
        ring: 'ring-amber-400',
        height: 'sm:order-2 sm:-translate-y-4',
    },
    2: {
        bg: 'bg-gradient-to-b from-slate-50 to-slate-100/60',
        border: 'border-slate-300',
        badgeBg: 'bg-gradient-to-r from-slate-400 to-gray-500',
        text: 'text-slate-700',
        icon: '🥈',
        title: 'المركز الثاني',
        ring: 'ring-slate-300',
        height: 'sm:order-1',
    },
    3: {
        bg: 'bg-gradient-to-b from-orange-50 to-orange-100/60',
        border: 'border-orange-300',
        badgeBg: 'bg-gradient-to-r from-amber-600 to-orange-500',
        text: 'text-orange-800',
        icon: '🥉',
        title: 'المركز الثالث',
        ring: 'ring-orange-300',
        height: 'sm:order-3',
    },
};

function StudentAvatar({
    name,
    avatarUrl,
    size = 'md',
    rank,
}: {
    name: string;
    avatarUrl: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    rank?: number;
}) {
    const sizeClasses = {
        sm: 'w-10 h-10 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-20 h-20 text-2xl',
    };

    const ringColor =
        rank === 1
            ? 'ring-4 ring-amber-400 ring-offset-2'
            : rank === 2
            ? 'ring-4 ring-slate-300 ring-offset-2'
            : rank === 3
            ? 'ring-4 ring-orange-300 ring-offset-2'
            : 'border-2 border-white shadow-sm';

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className={`${sizeClasses[size]} rounded-full object-cover ${ringColor}`}
            />
        );
    }

    const initials = name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('');

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-forest to-emerald-600 text-white font-black flex items-center justify-center ${ringColor}`}
        >
            {initials || 'ط'}
        </div>
    );
}

export default function StudentLeaderboardPage() {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/student/leaderboard', {
                cache: 'no-store',
            });
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                setError(json.message || 'حدث خطأ أثناء تحميل لوحة الشرف');
            }
        } catch {
            setError('فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const topThree = data ? data.leaderboard.filter((e) => e.rank <= 3) : [];
    const restOfStudents = data ? data.leaderboard.filter((e) => e.rank > 3) : [];

    return (
        <div className="space-y-8 pb-16 animate-fadeIn" dir="rtl">
            {/* Header / Hero Banner */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-forest via-emerald-800 to-forest p-8 sm:p-12 text-white">
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                    }}
                />
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/20 text-gold-light border border-gold/30 text-xs font-bold mb-3">
                            <span>✨</span>
                            <span>الطلاب المعتمدون المتميزون</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
                            لوحة الشرف 🏆
                        </h1>
                        <p className="text-white/85 text-sm sm:text-base max-w-xl font-medium leading-relaxed">
                            تضم لوحة الشرف نخبة الطلاب المتميزين الذين تم اعتمادهم وتكريمهم يدويًا من قِبل إدارة ومعلم منصة التوفيق تقديرًا لجهودهم وتفوقهم.
                        </p>
                    </div>

                    <div className="flex sm:flex-col items-center gap-3 shrink-0">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="bg-white/15 hover:bg-white/25 active:scale-95 text-white border border-white/30 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-2 backdrop-blur shadow-sm disabled:opacity-50"
                        >
                            <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
                            <span>تحديث اللوحة</span>
                        </button>
                        {data && data.totalHonored > 0 && (
                            <div className="bg-white/10 px-4 py-2 rounded-2xl text-xs font-bold text-white/90 border border-white/10">
                                {data.totalHonored} طلاب في لوحة الشرف
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Current Student Congratulatory Banner (if honored) */}
            {!loading && data && data.isInHonorBoard && data.myRank && (
                <div className="bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-400 text-amber-950 rounded-3xl p-6 shadow-lg flex items-center justify-between gap-4 border border-amber-300 animate-bounce-subtle">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/40 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">
                            🎉
                        </div>
                        <div>
                            <div className="text-lg font-black">مبارك! أنت ضمن أبطال لوحة الشرف</div>
                            <div className="text-sm font-semibold text-amber-900/80">
                                تم اعتمادك رسميًا من الإدارة بالمركز رقم #{data.myRank}. فخورون بك وبتميزك المستمر!
                            </div>
                        </div>
                    </div>
                    <div className="text-center shrink-0 bg-white/60 px-5 py-3 rounded-2xl border border-white shadow-sm">
                        <span className="text-[11px] font-bold block text-amber-900">مركزك</span>
                        <span className="text-3xl font-black text-amber-900">#{data.myRank}</span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-gray-100">
                    <div className="w-12 h-12 border-4 border-amber-400 border-t-forest rounded-full animate-spin" />
                    <p className="text-gray-500 font-bold text-sm">جاري تحميل لوحة الشرف...</p>
                </div>
            )}

            {/* Error State */}
            {!loading && error && (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-red-700 font-bold mb-2">{error}</p>
                    <button
                        onClick={fetchData}
                        className="mt-3 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && data && data.leaderboard.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm space-y-4">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">
                        🏆
                    </div>
                    <h3 className="text-xl font-black text-gray-800">لا يوجد طلاب في لوحة الشرف حاليًا</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        سيقوم الأدمن والمعلم باعتماد الطلاب المتفوقين قريبًا وتحديد ترتيبهم داخل لوحة الشرف. اجتهد وكن في صدارة المتميزين!
                    </p>
                </div>
            )}

            {/* Honored Students Content */}
            {!loading && !error && data && data.leaderboard.length > 0 && (
                <div className="space-y-8">
                    {/* Top 3 Podium (If any top 3 exist) */}
                    {topThree.length > 0 && (
                        <div>
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
                                    <span>🌟</span>
                                    <span>أوائل منصة التوفيق</span>
                                </h2>
                                <p className="text-xs text-gray-400 font-semibold mt-1">
                                    المراكز الأولى المعتمدة من قِبل إدارة المنصة
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                                {[1, 2, 3].map((rankNum) => {
                                    const entry = topThree.find((e) => e.rank === rankNum);
                                    if (!entry) return null;
                                    const cfg = PODIUM_CONFIG[rankNum];
                                    const isFirst = rankNum === 1;

                                    return (
                                        <div
                                            key={entry.studentId}
                                            className={`rounded-3xl border-2 ${cfg.bg} ${cfg.border} p-6 text-center transition-all duration-300 hover:shadow-xl relative ${cfg.height} ${
                                                entry.isMe ? 'ring-4 ring-emerald-500 ring-offset-2' : ''
                                            }`}
                                        >
                                            {/* Rank Badge */}
                                            <div
                                                className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${cfg.badgeBg} text-white px-4 py-1 rounded-full text-xs font-black shadow-md flex items-center gap-1`}
                                            >
                                                <span>{cfg.icon}</span>
                                                <span>{cfg.title}</span>
                                            </div>

                                            <div className="flex justify-center mt-3 mb-4">
                                                <StudentAvatar
                                                    name={entry.name}
                                                    avatarUrl={entry.avatar}
                                                    size={isFirst ? 'xl' : 'lg'}
                                                    rank={rankNum}
                                                />
                                            </div>

                                            <div className="font-black text-gray-900 text-lg truncate mb-1">
                                                {entry.name}
                                                {entry.isMe && (
                                                    <span className="inline-block mr-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] rounded-md font-bold">
                                                        أنت
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-xs text-gray-500 font-semibold">
                                                {gradeLabel(entry.grade) || 'طالب متميز'}
                                            </div>

                                            {entry.note && (
                                                <div className="text-[11px] font-bold text-amber-700 bg-amber-100/70 rounded-xl px-3 py-1 mt-2 inline-block">
                                                    {entry.note}
                                                </div>
                                            )}

                                            <div className={`mt-4 pt-3 border-t border-black/5`}>
                                                <div className="text-xs text-gray-500 font-medium">النقاط الحالية</div>
                                                <div className={`text-2xl font-black ${cfg.text}`}>
                                                    {entry.points.toLocaleString()}
                                                    <span className="text-xs font-bold mr-1">نقطة</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* All / Rest of Students Table */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                                    <span>📋</span>
                                    <span>ترتيب لوحة الشرف الكامل</span>
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    مرتَّب حسب الترتيب اليدوي المعتمد من الأدمن
                                </p>
                            </div>
                            <span className="text-xs font-bold text-gray-500 bg-offwhite px-3 py-1.5 rounded-full">
                                إجمالي المعتمدين: {data.totalHonored}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold">
                                        <th className="px-6 py-3.5 text-right w-20">المركز</th>
                                        <th className="px-6 py-3.5 text-right">الطالب</th>
                                        <th className="px-6 py-3.5 text-right hidden sm:table-cell">الصف الدراسي</th>
                                        <th className="px-6 py-3.5 text-center hidden md:table-cell">ملاحظة التميز</th>
                                        <th className="px-6 py-3.5 text-center">النقاط</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.leaderboard.map((entry) => {
                                        const isTop3 = entry.rank <= 3;
                                        const cfg = PODIUM_CONFIG[entry.rank];

                                        return (
                                            <tr
                                                key={entry.studentId}
                                                className={`transition-colors ${
                                                    entry.isMe
                                                        ? 'bg-emerald-50/60 font-bold border-r-4 border-emerald-500'
                                                        : isTop3
                                                        ? 'hover:bg-amber-50/30'
                                                        : 'hover:bg-gray-50/60'
                                                }`}
                                            >
                                                {/* Rank Number */}
                                                <td className="px-6 py-4">
                                                    {isTop3 ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xl">{cfg?.icon}</span>
                                                            <span className={`font-black text-sm ${cfg?.text}`}>
                                                                #{entry.rank}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-700 text-xs font-black">
                                                            #{entry.rank}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Student Name & Avatar */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <StudentAvatar
                                                            name={entry.name}
                                                            avatarUrl={entry.avatar}
                                                            size="sm"
                                                            rank={entry.rank}
                                                        />
                                                        <div>
                                                            <div
                                                                className={`font-black ${
                                                                    entry.isMe ? 'text-emerald-900' : 'text-gray-900'
                                                                }`}
                                                            >
                                                                {entry.name}
                                                            </div>
                                                            {entry.isMe && (
                                                                <span className="text-[10px] text-emerald-600 font-bold">
                                                                    (حسابك الشخصي)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Grade */}
                                                <td className="px-6 py-4 hidden sm:table-cell">
                                                    <span className="px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
                                                        {gradeLabel(entry.grade) || '—'}
                                                    </span>
                                                </td>

                                                {/* Note */}
                                                <td className="px-6 py-4 text-center hidden md:table-cell">
                                                    {entry.note ? (
                                                        <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full font-medium">
                                                            {entry.note}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Points */}
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`font-black text-base ${
                                                            entry.rank === 1
                                                                ? 'text-amber-600'
                                                                : entry.rank === 2
                                                                ? 'text-slate-600'
                                                                : entry.rank === 3
                                                                ? 'text-orange-600'
                                                                : entry.isMe
                                                                ? 'text-emerald-700'
                                                                : 'text-gray-800'
                                                        }`}
                                                    >
                                                        {entry.points.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mr-1 font-semibold">نقطة</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 text-center font-medium">
                            🔒 جميع الطلاب في هذه القائمة تم اعتمادهم رسميًا من قِبل إدارة المنصة • الترتيب يدوي ومحدد بدقة
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
