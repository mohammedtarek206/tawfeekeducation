'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentReferralsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    useEffect(() => {
        fetch('/api/student/referrals')
            .then(r => r.json())
            .then(res => {
                if (res.success) setData(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleCopyLink = () => {
        if (!data?.referralLink) return;
        navigator.clipboard.writeText(data.referralLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
    };

    const handleCopyCode = () => {
        if (!data?.referralCode) return;
        navigator.clipboard.writeText(data.referralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 3000);
    };

    const handleShare = async () => {
        if (!data?.referralLink) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'منصة التوفيق التعليمية',
                    text: `سجل في منصة التوفيق واستخدم كود الدعوة الخاص بي (${data.referralCode}) للبدء معنا!`,
                    url: data.referralLink,
                });
            } catch (err) {
                // fallback to copy link
                handleCopyLink();
            }
        } else {
            handleCopyLink();
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center py-10">حدث خطأ في جلب بيانات الإحالة</div>;

    const { referralCode, referralLink, settings, stats, referrals } = data;

    return (
        <div className="space-y-8 animate-fadeIn pb-16">
            {/* Header / Hero Banner */}
            <div className="bg-gradient-to-l from-forest to-forest-light text-white rounded-3xl p-6 sm:p-10 shadow-forest relative overflow-hidden">
                <div className="absolute inset-0 geo-grid-bg opacity-10 pointer-events-none" />
                <div className="relative z-10 max-w-3xl">
                    <span className="bg-gold/20 text-gold-light border border-gold/30 text-xs font-bold px-3.5 py-1 rounded-full inline-block mb-3">
                        🎁 برنامج دعوة الأصدقاء
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black mb-3 leading-tight">
                        ادعُ أصدقاءك واكسب +{settings.rewardPoints} نقطة لكل صديق!
                    </h1>
                    <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                        قم بمشاركة رابط أو كود الدعوة الخاص بك مع زملائك. عند انضمامهم واكتمال الشروط، ستُضاف النقاط تلقائياً إلى رصيدك!
                    </p>
                </div>
            </div>

            {/* Share Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/40 shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>🔗</span> رابط وقود الدعوة الخاص بك
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Referral Code Box */}
                    <div className="bg-offwhite p-5 rounded-2xl border border-earth/30 flex flex-col justify-between gap-3">
                        <div>
                            <span className="text-xs text-gray-500 font-bold block mb-1">كود الدعوة (Code)</span>
                            <div className="font-mono text-2xl font-black text-forest tracking-wider select-all">
                                {referralCode}
                            </div>
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copiedCode ? 'bg-emerald-600 text-white' : 'bg-forest text-white hover:bg-forest-light shadow-md'
                                }`}
                        >
                            {copiedCode ? '✓ تم نسخ الكود!' : '📋 نسخ الكود'}
                        </button>
                    </div>

                    {/* Referral Link Box */}
                    <div className="bg-offwhite p-5 rounded-2xl border border-earth/30 flex flex-col justify-between gap-3">
                        <div>
                            <span className="text-xs text-gray-500 font-bold block mb-1">الرابط المباشر للتسجيل (Link)</span>
                            <div className="font-mono text-xs font-bold text-forest truncate bg-white p-2.5 rounded-lg border border-gray-200 dir-ltr text-left">
                                {referralLink}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyLink}
                                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-forest text-white hover:bg-forest-light shadow-md'
                                    }`}
                            >
                                {copiedLink ? '✓ تم النسخ!' : '🔗 نسخ الرابط'}
                            </button>
                            <button
                                onClick={handleShare}
                                className="py-2.5 px-4 rounded-xl font-bold text-sm bg-gold text-darktext hover:bg-gold-dark transition-all shadow-md flex items-center justify-center gap-1 shrink-0"
                            >
                                📲 مشاركة
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">إجمالي الدعوات</div>
                    <div className="text-3xl font-black text-forest">{stats.total}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">في الانتظار</div>
                    <div className="text-3xl font-black text-amber-600">{stats.pending}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">مقبول ومكتمل</div>
                    <div className="text-3xl font-black text-emerald-600">{stats.rewarded}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-xs font-bold text-gray-500 mb-1">النقاط المكتسبة</div>
                    <div className="text-3xl font-black text-gold-dark">+{stats.totalPointsEarned}</div>
                </div>
            </div>

            {/* Invited Friends List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/40 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>👥</span> قائمة الأصدقاء المسجلين عبر كودك ({referrals.length})
                    </h2>
                    <Link href="/student/points" className="text-sm font-bold text-forest hover:underline">
                        عرض سجل النقاط الكامل ←
                    </Link>
                </div>

                {referrals.length === 0 ? (
                    <div className="text-center py-12 bg-offwhite/50 rounded-2xl border border-dashed border-gray-200">
                        <div className="text-4xl mb-3">🤝</div>
                        <h3 className="font-bold text-gray-800 mb-1">لم تقم بدعوة أحد بعد</h3>
                        <p className="text-xs text-gray-500 mb-4">انسخ رابط الدعوة وشاركه مع زملائك في المدرسة أو مجموعات الدراسة</p>
                        <button onClick={handleCopyLink} className="btn-gold px-6 py-2 text-xs font-bold">
                            نسخ رابط الدعوة الآن
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 bg-offwhite/50">
                                    <th className="p-3 rounded-r-xl">اسم الطالب</th>
                                    <th className="p-3">الصف الدراسي</th>
                                    <th className="p-3">تاريخ التسجيل</th>
                                    <th className="p-3">حالة الدعوة</th>
                                    <th className="p-3 rounded-l-xl">النقاط المكتسبة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {referrals.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-3 font-bold text-gray-900">{r.name}</td>
                                        <td className="p-3 text-gray-600 text-xs">{r.grade || '-'}</td>
                                        <td className="p-3 text-gray-500 text-xs dir-ltr text-right">
                                            {new Date(r.createdAt).toLocaleDateString('ar-EG')}
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block ${r.status === 'rewarded'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : r.status === 'approved' || r.status === 'verified'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : r.status === 'rejected'
                                                                ? 'bg-rose-100 text-rose-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                    }`}
                                            >
                                                {r.displayStatus}
                                            </span>
                                        </td>
                                        <td className="p-3 font-black text-forest">
                                            {r.pointsAwarded ? `+${r.pointsAmount} نقطة` : '0 نقطة'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
