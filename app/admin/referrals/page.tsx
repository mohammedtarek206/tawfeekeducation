'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminReferralsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    const loadData = () => {
        setLoading(true);
        fetch(`/api/admin/referrals?status=${statusFilter}`)
            .then(r => r.json())
            .then(res => {
                if (res.success) setData(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center py-10">حدث خطأ في جلب بيانات الإحالات</div>;

    const { settings, stats, topReferrers, referrals } = data;

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">إدارة ودعوات الإحالة (Referral Management)</h1>
                    <p className="text-gray-500 text-sm mt-1">متابعة كافة الدعوات المسجلة، أفضل الطلاب الداعين، وتفعيل المكافآت</p>
                </div>
                <Link
                    href="/admin/settings"
                    className="btn-primary self-start py-2.5 px-5 text-sm font-bold shadow-md shrink-0 flex items-center gap-2"
                >
                    <span>⚙️</span> إعدادات شروط الإحالة
                </Link>
            </div>

            {/* Current Active Rule Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
                <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">📌</span>
                    <div>
                        <div className="font-bold text-base">
                            النظام مفعّل حالياً: {settings.referralEnabled ? '🟢 شغال (ON)' : '🔴 معطل (OFF)'}
                        </div>
                        <div className="text-xs text-amber-800 mt-0.5">
                            قيمة المكافأة: <strong className="text-amber-950 font-black">{settings.referralPoints} نقطة</strong> | شرط الاستحقاق:
                            <strong className="text-amber-950 font-black">
                                {settings.referralQualificationRule === 'on_approval' ? ' فور موافقة الإدارة' : settings.referralQualificationRule === 'on_active_subscription' ? ' عند تفعيل اشتراك/عرض' : ' عند تفعيل أول عملية دفع'}
                            </strong>
                        </div>
                    </div>
                </div>
                <Link href="/admin/settings" className="text-xs font-bold bg-white text-amber-900 px-4 py-2 rounded-xl border border-amber-300 hover:bg-amber-100 transition-colors shrink-0">
                    تغيير القواعد ←
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-earth/40 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">إجمالي الدعوات</div>
                    <div className="text-3xl font-black text-forest">{stats.total}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-earth/40 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">في الانتظار</div>
                    <div className="text-3xl font-black text-amber-600">{stats.pending}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-earth/40 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">تم مكافأتها</div>
                    <div className="text-3xl font-black text-emerald-600">{stats.rewarded}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-earth/40 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">إجمالي النقاط الموزعة</div>
                    <div className="text-3xl font-black text-gold-dark">{stats.totalPointsAwarded}</div>
                </div>
            </div>

            {/* Top Referrers */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/40 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>👑</span> أكثر الطلاب نجاحاً في دعوة أصدقائهم (Top Referrers)
                </h2>
                {topReferrers.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">لا توجد إحالات مكافأة بعد</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {topReferrers.map((tr: any, idx: number) => (
                            <div key={tr.userId} className="bg-offwhite p-4 rounded-2xl border border-earth/30 space-y-1 relative">
                                <span className="absolute top-3 left-3 text-xs font-black text-gold bg-white px-2 py-0.5 rounded-full border border-gold/30">
                                    #{idx + 1}
                                </span>
                                <div className="font-bold text-gray-900 text-sm truncate">{tr.name}</div>
                                <div className="text-xs text-gray-500 dir-ltr text-right">{tr.phone}</div>
                                <div className="text-xs font-bold text-emerald-700 mt-2">
                                    {tr.successfulReferrals} دعوات ناجحة (+{tr.pointsEarnedFromReferrals} نقطة)
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Referrals Log Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/40 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>📋</span> سجل جميع عمليات الإحالة ({referrals.length})
                    </h2>

                    {/* Filter Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1 self-start sm:self-auto">
                        {[
                            { key: 'all', label: 'الكل' },
                            { key: 'pending', label: 'في الانتظار' },
                            { key: 'rewarded', label: 'تم المكافأة' },
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setStatusFilter(t.key)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === t.key ? 'bg-white text-forest shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {referrals.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">لا توجد إحالات تطابق هذا الفلتر</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 bg-offwhite/50">
                                    <th className="p-3 rounded-r-xl">الطالب الداعي (Referrer)</th>
                                    <th className="p-3">الطالب المدعُو (Referred)</th>
                                    <th className="p-3">حالة الطالب المدعُو</th>
                                    <th className="p-3">حالة الإحالة</th>
                                    <th className="p-3">النقاط</th>
                                    <th className="p-3 rounded-l-xl">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {referrals.map((r: any) => {
                                    const referrer = r.referrer || {};
                                    const referred = r.referred || {};
                                    return (
                                        <tr key={r._id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3 font-bold text-gray-900">
                                                <div>{referrer.name || 'غير معروف'}</div>
                                                <div className="text-xs text-gray-400 font-normal dir-ltr text-right">{referrer.phone}</div>
                                            </td>
                                            <td className="p-3 font-bold text-gray-900">
                                                <div>{referred.name || 'غير معروف'}</div>
                                                <div className="text-xs text-gray-400 font-normal dir-ltr text-right">{referred.phone}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                                                    {referred.status === 'approved' ? 'موافق عليه' : referred.status === 'pending' ? 'بانتظار الموافقة' : referred.status}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === 'rewarded'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : r.status === 'approved' || r.status === 'verified'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}
                                                >
                                                    {r.status === 'rewarded' ? 'تم منح المكافأة 🎉' : r.status === 'approved' ? 'مقبول' : 'قيد الانتظار'}
                                                </span>
                                            </td>
                                            <td className="p-3 font-black text-forest">
                                                {r.pointsAwarded ? `+${r.pointsAmount} نقطة` : '0'}
                                            </td>
                                            <td className="p-3 text-xs text-gray-500 dir-ltr text-right">
                                                {new Date(r.createdAt).toLocaleDateString('ar-EG')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
