'use client';

import { useEffect, useState, useCallback } from 'react';
import { gradeLabel } from '@/lib/constants/grades';

interface LeaderboardEntry {
    rank: number;
    studentId: string;
    name: string;
    points: number;
    level: number;
    grade: string;
    avatar: string | null;
    isMe: boolean;
}

interface LeaderboardData {
    leaderboard: LeaderboardEntry[];
    myRank: number | null;
    totalStudents: number;
    topStudentName: string | null;
    highestPoints: number;
}

const RANK_CONFIG: Record<number, { bg: string; border: string; badgeBg: string; text: string; icon: string }> = {
    1: { bg: 'bg-amber-50', border: 'border-amber-300', badgeBg: 'bg-amber-400', text: 'text-amber-700', icon: '🥇' },
    2: { bg: 'bg-slate-50', border: 'border-slate-300', badgeBg: 'bg-slate-400', text: 'text-slate-600', icon: '🥈' },
    3: { bg: 'bg-orange-50', border: 'border-orange-300', badgeBg: 'bg-orange-400', text: 'text-orange-700', icon: '🥉' },
};

function Avatar({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl: string | null; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-xs';
    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className={`${sizeClass} rounded-full object-cover border-2 border-white shadow`} />;
    }
    const initials = name.trim().split(' ').slice(0, 2).map(w => w[0]).join('');
    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-green-700 to-emerald-500 text-white font-black flex items-center justify-center border-2 border-white shadow`}>
            {initials}
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
            const res = await fetch('/api/student/leaderboard?limit=50');
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
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-6 pb-16 animate-fadeIn" dir="rtl">
            {/* Hero Banner */}
            <div className="relative w-full h-44 sm:h-56 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300">
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}
                />
                <div className="relative z-10 text-center text-white drop-shadow-md">
                    <div className="text-6xl mb-2">🏆</div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">لوحة الشرف</h1>
                    <p className="text-sm font-semibold mt-1 text-white/80">أبطال منصة التوفيق مرتَّبون حسب النقاط</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur"
                >
                    <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
                    تحديث
                </button>
            </div>

            {/* My Rank Banner */}
            {!loading && data && data.myRank && (
                <div className="bg-gradient-to-l from-green-800 to-emerald-700 text-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⭐</span>
                        <div>
                            <div className="font-black text-lg">ترتيبك الحالي</div>
                            <div className="text-white/80 text-sm">من أصل {data.totalStudents?.toLocaleString()} طالب</div>
                        </div>
                    </div>
                    <div className="text-4xl font-black text-amber-300">#{data.myRank}</div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 font-medium text-sm">جاري تحميل لوحة الشرف...</p>
                </div>
            )}

            {/* Error State */}
            {!loading && error && (
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
            )}

            {/* Empty State */}
            {!loading && !error && data && data.leaderboard.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
                    <div className="text-5xl mb-3">🏆</div>
                    <p className="text-gray-700 font-bold mb-1">لا توجد بيانات بعد</p>
                    <p className="text-xs text-gray-400 mt-1">
                        ستظهر لوحة الشرف بعد أن يبدأ الطلاب في جمع النقاط
                    </p>
                </div>
            )}

            {/* Leaderboard Content */}
            {!loading && !error && data && data.leaderboard.length > 0 && (
                <div className="space-y-6">
                    {/* Top 3 Podium */}
                    {data.leaderboard.some(e => e.rank <= 3) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map(rankNum => {
                                const entry = data.leaderboard.find(e => e.rank === rankNum);
                                if (!entry) return null;
                                const cfg = RANK_CONFIG[rankNum];
                                return (
                                    <div
                                        key={entry.studentId}
                                        className={`rounded-2xl border-2 ${cfg.bg} ${cfg.border} p-5 text-center transition-all hover:shadow-lg ${entry.isMe ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                                    >
                                        <div className="text-4xl mb-3">{cfg.icon}</div>
                                        <div className="flex justify-center mb-3">
                                            <Avatar name={entry.name} avatarUrl={entry.avatar} size="lg" />
                                        </div>
                                        <div className={`font-black text-gray-900 text-base truncate ${entry.isMe ? 'text-green-800' : ''}`}>
                                            {entry.name}
                                            {entry.isMe && <span className="text-xs font-bold text-green-600 block">أنت</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">{gradeLabel(entry.grade) || 'طالب'}</div>
                                        <div className={`mt-3 text-2xl font-black ${cfg.text}`}>
                                            {entry.points.toLocaleString()}
                                            <span className="text-sm font-bold mr-1">نقطة</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">المستوى {entry.level}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900 flex items-center gap-2">
                            <span>📋</span> الترتيب الكامل
                            <span className="text-xs text-gray-400 font-normal mr-auto">
                                {data.totalStudents} طالب مسجّل
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                                        <th className="px-4 py-3 text-right">المركز</th>
                                        <th className="px-4 py-3 text-right">الطالب</th>
                                        <th className="px-4 py-3 text-right hidden sm:table-cell">الصف</th>
                                        <th className="px-4 py-3 text-center hidden sm:table-cell">المستوى</th>
                                        <th className="px-4 py-3 text-center">النقاط</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.leaderboard.map((entry) => {
                                        const cfg = RANK_CONFIG[entry.rank];
                                        return (
                                            <tr
                                                key={entry.studentId}
                                                className={`transition-colors ${entry.isMe
                                                    ? 'bg-green-50 border-l-4 border-green-500'
                                                    : entry.rank <= 3
                                                        ? (cfg?.bg || 'hover:bg-gray-50')
                                                        : 'hover:bg-gray-50/50'
                                                    }`}
                                            >
                                                {/* Rank */}
                                                <td className="px-4 py-3 font-black w-14">
                                                    {entry.rank <= 3 ? (
                                                        <span className="text-xl">{RANK_CONFIG[entry.rank]?.icon}</span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-black">
                                                            {entry.rank}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Name + Avatar */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={entry.name} avatarUrl={entry.avatar} size="sm" />
                                                        <div>
                                                            <div className={`font-bold ${entry.isMe ? 'text-green-800' : 'text-gray-900'}`}>
                                                                {entry.name}
                                                            </div>
                                                            {entry.isMe && (
                                                                <div className="text-[10px] font-bold text-green-600">أنت</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Grade */}
                                                <td className="px-4 py-3 hidden sm:table-cell">
                                                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold whitespace-nowrap">
                                                        {gradeLabel(entry.grade) || '—'}
                                                    </span>
                                                </td>

                                                {/* Level */}
                                                <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {entry.level}
                                                    </span>
                                                </td>

                                                {/* Points */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-black text-base ${entry.rank === 1
                                                        ? 'text-amber-600'
                                                        : entry.rank === 2
                                                            ? 'text-slate-600'
                                                            : entry.rank === 3
                                                                ? 'text-orange-600'
                                                                : entry.isMe
                                                                    ? 'text-green-700'
                                                                    : 'text-gray-800'
                                                        }`}>
                                                        {entry.points.toLocaleString()}
                                                    </span>
                                                    <span className="text-gray-400 text-xs mr-1">نقطة</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                            الترتيب يعتمد على النقاط الفعلية المحفوظة في قاعدة البيانات • النقاط المكتسبة من المهام والإحالات والامتحانات والإنجازات
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
