'use client';

import { useEffect, useState } from 'react';

export default function AdminGamificationPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/points')
            .then(r => r.json())
            .then(res => { if (res.success) setData(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">النقاط والسجلات</h1>
                <p className="text-gray-500 mt-1">متابعة نظام النقاط والتقدم للطلاب</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : !data ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-500">لا يوجد بيانات</div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-3xl mb-2" suppressHydrationWarning>🪙</div>
                            <div className="text-3xl font-black text-gray-900" suppressHydrationWarning>{data.totalPointsAwarded?.toLocaleString() ?? 0}</div>
                            <div className="text-sm font-medium text-gray-500 mt-1">إجمالي النقاط الممنوحة</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-3xl mb-2" suppressHydrationWarning>🏆</div>
                            <div className="text-3xl font-black text-gray-900" suppressHydrationWarning>{data.topStudents?.length ?? 0}</div>
                            <div className="text-sm font-medium text-gray-500 mt-1">طلاب في المتصدرين</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="text-3xl mb-2" suppressHydrationWarning>📊</div>
                            <div className="text-3xl font-black text-gray-900" suppressHydrationWarning>{data.totalTransactions?.toLocaleString() ?? 0}</div>
                            <div className="text-sm font-medium text-gray-500 mt-1">إجمالي المعاملات</div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900"><span suppressHydrationWarning>🏆</span> قائمة المتصدرين</h2>
                        </div>
                        {!data.topStudents || data.topStudents.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">لا يوجد بيانات متاحة</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {data.topStudents.map((s: any, i: number) => (
                                    <div key={s._id} className="px-6 py-4 flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0
                      ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900">{s.name}</div>
                                            <div className="text-xs text-gray-500">{s.phone}</div>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-black text-tawfeek-primary" suppressHydrationWarning>{s.points?.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">نقطة</div>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
