'use client';
import { useEffect, useState } from 'react';

export default function StudentRewardsPage() {
    const [rewards, setRewards] = useState<any[]>([]);
    const [points, setPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const fetchData = () => {
        Promise.all([
            fetch('/api/student/rewards').then((r) => r.json()),
            fetch('/api/auth/me').then((r) => r.json()),
        ])
            .then(([rewardsRes, meRes]) => {
                if (rewardsRes.success) setRewards(rewardsRes.data.rewards);
                if (meRes.success) setPoints(meRes.data.user.points);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleRedeem = async (reward: any) => {
        if (points < reward.requiredPoints) {
            setMessage({ text: `نقاطك غير كافية. تحتاج ${reward.requiredPoints} نقطة وعندك ${points}`, type: 'error' });
            return;
        }
        if (!reward.available) {
            setMessage({ text: 'نفدت الكمية من هذه الجائزة', type: 'error' });
            return;
        }
        setRedeeming(reward._id);
        setMessage(null);
        try {
            const res = await fetch('/api/student/rewards/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId: reward._id }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: 'تم تقديم طلب الاستبدال بنجاح! في انتظار موافقة الإدارة.', type: 'success' });
                setPoints(data.data.newBalance);
                fetchData();
            } else {
                setMessage({ text: data.message || 'حدث خطأ', type: 'error' });
            }
        } catch {
            setMessage({ text: 'خطأ في الاتصال', type: 'error' });
        } finally {
            setRedeeming(null);
        }
    };

    if (loading) return <div className="animate-pulse h-96 bg-gray-200 rounded-2xl" />;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-tawfeek-gold to-yellow-500 rounded-2xl p-8 text-white relative overflow-hidden shadow-gold">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="text-center sm:text-right">
                        <h1 className="text-3xl font-black mb-2">متجر الجوائز 🎁</h1>
                        <p className="text-orange-100">استبدل نقاطك بجوائز وهدايا حقيقية!</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 text-center min-w-[200px]">
                        <div className="text-sm text-yellow-100 font-bold mb-1">رصيدك الحالي</div>
                        <div className="text-4xl font-black">{points} <span className="text-sm font-normal">نقطة</span></div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`rounded-xl p-4 text-sm font-medium border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {rewards.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-6xl mb-4">🎁</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد جوائز متاحة حالياً</h3>
                    <p className="text-gray-500">ستظهر هنا بمجرد إضافتها من الأدمن</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map((reward: any) => {
                        const canRedeem = reward.available && points >= reward.requiredPoints;
                        return (
                            <div key={reward._id} className="card-hover flex flex-col h-full bg-white relative overflow-hidden">
                                {!reward.available && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                        <div className="bg-red-500 text-white font-bold px-4 py-2 rounded-xl transform -rotate-12 border-2 border-white shadow-lg">
                                            نفدت الكمية
                                        </div>
                                    </div>
                                )}
                                <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-6xl -mt-6 -mx-6 mb-4 border-b border-gray-100">
                                    🎁
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1 text-center">{reward.name}</h3>
                                    {reward.description && <p className="text-sm text-gray-500 text-center mb-2 line-clamp-2">{reward.description}</p>}
                                    <div className="flex items-center justify-center gap-2 text-tawfeek-gold font-black text-xl mb-6">
                                        {reward.requiredPoints} <span>🪙</span>
                                    </div>
                                    <button
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!canRedeem || redeeming === reward._id}
                                        className={`mt-auto py-3 rounded-xl font-bold transition-colors ${canRedeem
                                                ? 'bg-tawfeek-green text-white hover:bg-tawfeek-green-light'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {redeeming === reward._id ? 'جاري...' : canRedeem ? 'استبدال الآن' : `تحتاج ${reward.requiredPoints - points} نقطة إضافية`}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
