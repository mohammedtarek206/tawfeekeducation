'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gradeLabel } from '@/lib/constants/grades';

export default function StudentSubscriptionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/student/subscriptions/plans');
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const claimFreeOffer = async (planId: string) => {
        try {
            const res = await fetch('/api/student/subscriptions/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });
            const result = await res.json();
            alert(result.message);
            if (result.success) {
                window.location.reload();
            }
        } catch (error) {
            alert('حدث خطأ أثناء طلب العرض المجاني');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold">جاري تحميل بيانات الاشتراكات...</div>;
    if (!data) return <div className="p-8 text-center text-red-500 font-bold">حدث خطأ أثناء تحميل الباقات</div>;

    const {
        plans = [],
        accountStatus,
        subscriptionStatus,
        isFreeStudent,
        freeSlotNumber,
        currentPlan,
        subscriptionStartDate,
        subscriptionEndDate,
        requestsHistory = [],
        studentGrade,
        freeOfferStats,
    } = data;

    const hasPendingRequest = requestsHistory.some((r: any) => r.status === 'pending');
    const isOfferActive = freeOfferStats?.isOfferActive;

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto min-h-screen pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-forest">الاشتراكات والباقات</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        الصف الدراسي: <strong className="text-darktext">{gradeLabel(studentGrade)}</strong>
                    </p>
                </div>
            </div>

            {/* Account Status Warnings */}
            {accountStatus === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-amber-900 mb-1">⏳ حسابك ما زال قيد المراجعة من الإدارة</h2>
                        <p className="text-amber-800 text-sm">يمكنك تصفح الباقات واختيار المناسب لك، وسيتاح خيار التحويل والدفع فور موافقة الإدارة على الحساب.</p>
                    </div>
                    <Link href="/pending" className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-sm shrink-0 hover:bg-amber-700 transition-colors">
                        عرض حالة الحساب
                    </Link>
                </div>
            )}

            {/* Active Subscription Banner (Free or Paid) */}
            {subscriptionStatus === 'active' && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 md:p-8 mb-10 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-200 pb-4 mb-4">
                        <div>
                            <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {isFreeStudent ? `🎁 اشتراك مجاني مفعّل (مقعد #${freeSlotNumber || '1'})` : 'اشتراك مدفوع نشط'}
                            </span>
                            <h2 className="text-2xl font-black text-emerald-900 mt-2">
                                {currentPlan?.name || (isFreeStudent ? 'الباقة المجانية الشاملة' : 'الاشتراك المميز')}
                            </h2>
                        </div>
                        <div className="text-emerald-800 font-medium text-sm">
                            صالح حتى: <span className="font-bold font-mono text-base">{subscriptionEndDate ? new Date(subscriptionEndDate).toLocaleDateString('ar-EG') : 'السنة الدراسية كاملة'}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-emerald-800">
                        <div>تاريخ التفعيل: <strong>{subscriptionStartDate ? new Date(subscriptionStartDate).toLocaleDateString('ar-EG') : '-'}</strong></div>
                        <div>الدروس والامتحانات المتاحة: <strong>وصول كامل لكافة محتويات الصف الدراسي</strong></div>
                    </div>
                </div>
            )}

            {/* Payment Requests History */}
            {requestsHistory.length > 0 && (
                <div className="bg-white rounded-3xl border border-earth/40 p-6 md:p-8 mb-10 shadow-sm">
                    <h2 className="text-xl font-black text-forest mb-4">سجل طلبات الاشتراك والدفع</h2>
                    <div className="space-y-4">
                        {requestsHistory.map((req: any) => (
                            <div key={req._id} className="p-4 rounded-2xl border border-gray-100 bg-offwhite/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="font-bold text-darktext text-base">{req.planId?.name || 'طلب اشتراك'}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        تاريخ الطلب: {new Date(req.createdAt).toLocaleDateString('ar-EG')} - طريقة الدفع: {req.paymentMethod}
                                    </div>
                                    {req.adminNote && req.status === 'rejected' && (
                                        <div className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                            سبب الرفض: {req.adminNote}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-forest font-mono text-lg">{req.amount} ج.م</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'pending' ? 'bg-amber-100 text-amber-800' : req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plans List */}
            <h2 className="text-2xl font-black text-forest mb-6">الباقات المتاحة لصفك الدراسي</h2>

            {plans.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border text-gray-500 font-bold">
                    لا توجد باقات متاحة حالياً لصفك الدراسي.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {plans.map((plan: any) => {
                        const isFreePlanType = plan.offerType === 'FREE_FIRST_N';
                        const isDiscountOffer = plan.offerType === 'DISCOUNT_FIRST_N';
                        const canClaimFree = isOfferActive && isFreePlanType;

                        let finalPrice = plan.price;
                        if (isDiscountOffer && plan.discountPercentage) {
                            finalPrice = plan.price - (plan.price * (plan.discountPercentage / 100));
                        }

                        const isCurrentPlanActive = subscriptionStatus === 'active' && (currentPlan?._id === plan._id || isFreeStudent);

                        return (
                            <div key={plan._id} className="bg-white rounded-3xl shadow-lg border border-earth/40 p-8 relative flex flex-col hover:shadow-xl transition-all">
                                {isFreePlanType && (
                                    <div className={`absolute -top-4 right-6 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md ${canClaimFree ? 'bg-emerald-600' : 'bg-gray-500'}`}>
                                        {canClaimFree ? `عرض مجاني لأول ${freeOfferStats?.freeStudentsLimit || 100} طالب` : 'انتهى العرض المجاني'}
                                    </div>
                                )}

                                <div className="text-xs font-bold text-tawfeek-green mb-2">{gradeLabel(plan.grade)}</div>
                                <h3 className="text-2xl font-black text-forest mb-4">{plan.name}</h3>
                                <p className="text-gray-500 text-sm mb-6 flex-grow">{plan.description}</p>

                                <div className="mb-6">
                                    {isFreePlanType && canClaimFree ? (
                                        <div className="text-4xl font-black text-emerald-600">مجانًا! 🎉</div>
                                    ) : (
                                        <div className="flex items-end gap-2">
                                            <div className="text-4xl font-black text-forest">{finalPrice}</div>
                                            <div className="text-gray-500 mb-1 font-medium text-sm">ج.م / {plan.type === 'monthly' ? 'شهر' : plan.type === 'term' ? 'ترم' : 'سنة'}</div>
                                        </div>
                                    )}
                                    {plan.originalPrice && plan.originalPrice > plan.price && (
                                        <div className="text-gray-400 line-through mt-2 text-sm pr-1">{plan.originalPrice} ج.م</div>
                                    )}
                                </div>

                                <ul className="space-y-3 mb-8 text-sm">
                                    {plan.features?.map((f: string, i: number) => (
                                        <li key={i} className="flex gap-2.5 text-gray-700">
                                            <span className="text-emerald-600 font-bold">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>

                                {accountStatus === 'pending' ? (
                                    <Link href={`/pending?planId=${plan._id}`} className="block w-full text-center py-4 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-md">
                                        الحساب قيد المراجعة
                                    </Link>
                                ) : isCurrentPlanActive ? (
                                    <button disabled className="w-full py-4 rounded-xl bg-emerald-100 text-emerald-800 font-bold cursor-not-allowed">
                                        أنت مشترك حالياً
                                    </button>
                                ) : hasPendingRequest ? (
                                    <button disabled className="w-full py-4 rounded-xl bg-amber-100 text-amber-800 font-bold cursor-not-allowed">
                                        طلبك قيد المراجعة
                                    </button>
                                ) : isFreePlanType && canClaimFree ? (
                                    <button
                                        onClick={() => claimFreeOffer(plan._id)}
                                        className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
                                    >
                                        احصل عليها مجاناً الآن 🎉
                                    </button>
                                ) : (
                                    <Link href={`/student/subscriptions/${plan._id}/checkout`} className="block w-full text-center py-4 rounded-xl bg-forest text-white font-bold hover:bg-forest/90 transition-colors shadow-md shadow-forest/20">
                                        اشترك الآن
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
