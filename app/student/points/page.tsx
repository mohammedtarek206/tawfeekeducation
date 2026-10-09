'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentPointsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/student/points')
            .then(r => r.json())
            .then(res => {
                if (res.success) setData(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
                <div className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
            </div>
        );
    }

    if (!data) return <div className="text-center py-10">حدث خطأ في جلب بيانات النقاط</div>;

    const { balance, level, rank, leaderboard, transactions } = data;

    return (
        <div className="space-y-8 animate-fadeIn pb-16">
            {/* Header Card */}
            <div className="bg-gradient-to-l from-forest to-forest-light text-white rounded-3xl p-6 sm:p-10 shadow-forest relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="absolute inset-0 geo-grid-bg opacity-10 pointer-events-none" />
                <div className="relative z-10">
                    <span className="bg-gold/20 text-gold-light border border-gold/30 text-xs font-bold px-3.5 py-1 rounded-full inline-block mb-3">
                        ⭐ رصيد النقاط والترتيب
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black mb-2 flex items-center gap-3">
                        <span>{balance}</span>
                        <span className="text-xl sm:text-2xl font-bold text-gold">نقطة تعليمية</span>
                    </h1>
                    <p className="text-white/80 text-sm font-medium">
                        المستوى الحالي: <span className="font-bold text-white text-base">المستوى {level} (مستكشف معتمد)</span>
                    </p>
                </div>
                <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-6 rounded-2xl text-center shrink-0 min-w-[160px]">
                    <span className="text-xs font-bold text-white/80 block mb-1">ترتيبك في المنصة</span>
                    <div className="text-3xl font-black text-gold">#{rank}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transaction Ledger */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-earth/40 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span>📜</span> سجل حركة النقاط (Ledger Audit)
                        </h2>
                        <span className="text-xs font-bold text-gray-500 bg-offwhite px-3 py-1 rounded-full">
                            أحدث المعاملات
                        </span>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-12 bg-offwhite/50 rounded-2xl border border-dashed border-gray-200">
                            <div className="text-4xl mb-3">⭐</div>
                            <h3 className="font-bold text-gray-800 mb-1">لا توجد معاملة نقاط بعد</h3>
                            <p className="text-xs text-gray-500">شاهد الحصص، وأكمل الاختبارات، وادعُ أصدقاءك لاكتساب النقاط!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((t: any) => {
                                const isPositive = t.amount > 0;
                                return (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-forest/20 transition-all shadow-2xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                    }`}
                                            >
                                                {isPositive ? '＋' : '－'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{t.reason}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 dir-ltr text-right">
                                                    {new Date(t.createdAt).toLocaleDateString('ar-EG', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-left shrink-0">
                                            <div className={`font-black text-base ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isPositive ? `+${t.amount}` : t.amount}
                                            </div>
                                            <div className="text-xs text-gray-400 font-bold mt-0.5">
                                                الرصيد: {t.balanceAfter}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Leaderboard Preview */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/40 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span>🏆</span> لوحة المتفوقين
                        </h2>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                            Top 5
                        </span>
                    </div>

                    <div className="space-y-3">
                        {leaderboard.map((item: any, idx: number) => {
                            const isMe = item.rank === rank;
                            const badge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${item.rank}`;
                            return (
                                <div
                                    key={item.studentId}
                                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${isMe ? 'bg-gold/10 border-gold/40 font-bold' : 'bg-offwhite/50 border-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg w-8 font-black text-center">{badge}</span>
                                        <div>
                                            <div className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.grade || 'طالب'}</div>
                                        </div>
                                    </div>
                                    <div className="font-black text-forest text-sm shrink-0">
                                        {item.points} نقطة
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2 text-center border-t border-gray-100">
                        <Link href="/student/referrals" className="btn-gold block w-full py-2.5 text-xs font-bold shadow-md">
                            🎁 ادعُ أصدقاءك لاكتساب المزيد من النقاط
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
