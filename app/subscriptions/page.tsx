'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import { gradeLabel } from '@/lib/constants/grades';
import { formatDate } from '@/lib/utils/helpers';

export default function SubscriptionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/student/subscriptions/plans');
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const claimFreeOffer = async (planId?: string) => {
        setClaiming(true);
        try {
            const res = await fetch('/api/student/subscriptions/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });
            const result = await res.json();
            alert(result.message);
            if (result.success) {
                window.location.reload();
            }
        } catch {
            alert('حدث خطأ أثناء طلب العرض المجاني');
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-offwhite flex flex-col justify-between">
                <Navbar />
                <div className="py-32 text-center text-forest font-bold text-lg animate-pulse">
                    جاري تحميل الباقات والاشتراكات...
                </div>
                <Footer />
            </div>
        );
    }

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
        activeSubscriptions = [],
    } = data || {};

    const freeOfferSettings = freeOfferStats?.settings;
    const isOfferActive = freeOfferStats?.isOfferActive;

    return (
        <div className="min-h-screen bg-offwhite flex flex-col justify-between">
            <Navbar />

            <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="bg-forest/10 text-forest text-xs font-bold px-4 py-1.5 rounded-full border border-forest/20 inline-block mb-3">
                        اشتراكات وباقات منصة التوفيق 🌟
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-darktext mb-4 leading-tight">
                        اختر الباقة المناسبة لطموحك
                    </h1>
                    <p className="text-gray-600 text-base sm:text-lg">
                        وصول كامل لشروحات المواد والأسئلة والتنويعات المختلفة للاختبارات والمراجعات النهائية.
                    </p>
                    {studentGrade && (
                        <div className="mt-3 text-sm font-bold text-forest">
                            الصف الدراسي الحالي: {gradeLabel(studentGrade)}
                        </div>
                    )}
                </div>

                {/* Section 1: Free Offer Banner (if configured in DB) */}
                {freeOfferSettings?.freeOfferEnabled && (
                    <div className="mb-12 bg-gradient-to-r from-forest via-forest-dark to-forest rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-gold/40">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                            <div className="text-center lg:text-right">
                                <span className="bg-gold text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full shadow-sm inline-block mb-3">
                                    🎁 عرض خاص للطلاب الجدد
                                </span>
                                <h2 className="text-2xl sm:text-4xl font-black mb-3 text-gold">
                                    {freeOfferSettings.freeOfferTitle || `أول ${freeOfferStats?.freeStudentsLimit || 100} طالب مجاناً!`}
                                </h2>
                                <p className="text-white/90 text-sm sm:text-base max-w-xl leading-relaxed mb-4">
                                    {freeOfferSettings.freeOfferDescription || 'احصل على تفعيل مجاني كامل يشمل كافة الدروس والامتحانات لصفك الدراسي.'}
                                </p>

                                {/* Dynamic DB numbers */}
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs sm:text-sm font-bold bg-black/20 p-3 rounded-2xl border border-white/10 w-fit">
                                    <span className="text-gold font-mono">
                                        تم حجز {freeOfferStats?.freeStudentsCount || 0} من {freeOfferStats?.freeStudentsLimit || 100}
                                    </span>
                                    <span className="text-white/40">|</span>
                                    <span className="text-emerald-300 font-mono">
                                        متبقي {freeOfferStats?.remainingSlots || 0} مكان
                                    </span>
                                </div>
                            </div>

                            <div className="shrink-0 text-center">
                                {isFreeStudent || subscriptionStatus === 'active' ? (
                                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-6 py-3.5 rounded-2xl font-bold text-sm">
                                        ✓ أنت مستفيد بالفعل من الاشتراك
                                    </div>
                                ) : isOfferActive ? (
                                    <button
                                        onClick={() => claimFreeOffer()}
                                        disabled={claiming}
                                        className="btn-gold px-8 py-4 text-base font-extrabold shadow-xl shadow-gold/30 hover:scale-105 transition-transform disabled:opacity-50"
                                    >
                                        {claiming ? 'جاري التفعيل...' : freeOfferSettings.freeOfferCtaText || 'احجز مكانك مجاناً 🎉'}
                                    </button>
                                ) : (
                                    <div className="bg-black/40 text-gray-300 px-6 py-3.5 rounded-2xl text-sm font-bold">
                                        انتهى العرض المجاني (اكتمل العدد)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 2: Active Student Subscription details */}
                {subscriptionStatus === 'active' && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 mb-12 shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-200 pb-4 mb-4">
                            <div>
                                <span className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-1 rounded-full">
                                    {isFreeStudent ? `🎁 اشتراك مجاني مفعّل (مقعد #${freeSlotNumber || '1'})` : 'اشتراك مدفوع نشط'}
                                </span>
                                <h3 className="text-2xl font-black text-emerald-950 mt-2">
                                    {currentPlan?.name || (isFreeStudent ? 'الباقة المجانية الشاملة' : 'الاشتراك المميز')}
                                </h3>
                            </div>
                            <div className="text-emerald-900 font-bold text-sm bg-white/80 px-4 py-2 rounded-xl border border-emerald-200">
                                ينتهي في: <span className="font-mono text-base">{subscriptionEndDate ? formatDate(subscriptionEndDate) : 'السنة الدراسية'}</span>
                            </div>
                        </div>
                        <div className="text-sm text-emerald-900">
                            تاريخ البدء: <strong>{subscriptionStartDate ? formatDate(subscriptionStartDate) : '-'}</strong> — حالة الوصول: <strong>وصول كامل لكافة شروحات واختبارات الصف</strong>
                        </div>
                    </div>
                )}

                {/* Section 3: Paid Plans List */}
                <h2 className="text-2xl sm:text-3xl font-black text-darktext mb-8 text-center sm:text-right">
                    باقات الدروس والاختبارات
                </h2>

                {plans.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border text-gray-500 font-bold shadow-sm">
                        لا توجد باقات متاحة حالياً. تواصل مع Admin لإضافة باقات جديدة.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        {plans.map((plan: any) => {
                            const isFreePlanType = plan.offerType === 'FREE_FIRST_N';
                            const isDiscountOffer = plan.offerType === 'DISCOUNT_FIRST_N';
                            const canClaimFree = isOfferActive && isFreePlanType;

                            let finalPrice = plan.price;
                            if (isDiscountOffer && plan.discountPercentage) {
                                finalPrice = Math.round(plan.price - (plan.price * (plan.discountPercentage / 100)));
                            }

                            const isCurrentPlanActive = subscriptionStatus === 'active' && (currentPlan?._id === plan._id || isFreeStudent);
                            const planPendingRequest = requestsHistory.find((r: any) => r.planId?._id === plan._id && r.status === 'pending');

                            return (
                                <div
                                    key={plan._id}
                                    className="bg-white rounded-3xl shadow-lg border border-earth/40 p-8 relative flex flex-col justify-between hover:shadow-2xl transition-all duration-300"
                                >
                                    {plan.offerEnabled && (
                                        <div className="absolute -top-3.5 right-6 bg-gold text-white px-3.5 py-1 rounded-full text-xs font-black shadow-md">
                                            {isFreePlanType ? 'عرض مجاني' : `خصم ${plan.discountPercentage}%`}
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-xs font-bold text-forest mb-2">
                                            {gradeLabel(plan.grade)}
                                        </div>
                                        <h3 className="text-2xl font-black text-darktext mb-3">{plan.name}</h3>
                                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{plan.description}</p>

                                        <div className="mb-6 bg-offwhite p-4 rounded-2xl border border-earth/20">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-forest font-mono">{finalPrice}</span>
                                                <span className="text-gray-500 font-bold text-sm">
                                                    ج.م / {plan.type === 'monthly' ? 'شهرياً' : plan.type === 'term' ? 'ترم' : 'سنوياً'}
                                                </span>
                                            </div>
                                            {plan.originalPrice && plan.originalPrice > plan.price && (
                                                <div className="text-gray-400 line-through text-xs font-mono mt-1">
                                                    {plan.originalPrice} ج.م
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-2 font-medium">
                                                مدة الاشتراك: {plan.durationInDays} يوم
                                            </div>
                                        </div>

                                        <ul className="space-y-3 mb-8 text-sm">
                                            {plan.features?.map((f: string, i: number) => (
                                                <li key={i} className="flex items-center gap-2.5 text-gray-700">
                                                    <span className="w-5 h-5 rounded-full bg-forest/10 text-forest font-extrabold flex items-center justify-center text-xs shrink-0">
                                                        ✓
                                                    </span>
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        {accountStatus === 'pending' ? (
                                            <Link
                                                href={`/pending?planId=${plan._id}`}
                                                className="block w-full text-center py-3.5 rounded-2xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-md text-sm"
                                            >
                                                الحساب قيد المراجعة من الإدارة
                                            </Link>
                                        ) : isCurrentPlanActive ? (
                                            <button disabled className="w-full py-3.5 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-sm cursor-not-allowed">
                                                أنت مشترك حالياً بهذه الباقة
                                            </button>
                                        ) : planPendingRequest ? (
                                            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl text-center">
                                                <span className="text-amber-800 text-xs font-bold block mb-1">
                                                    لديك طلب دفع قيد المراجعة لهذه الباقة ⏳
                                                </span>
                                            </div>
                                        ) : isFreePlanType && canClaimFree ? (
                                            <button
                                                onClick={() => claimFreeOffer(plan._id)}
                                                disabled={claiming}
                                                className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 text-sm"
                                            >
                                                احجز مكانك مجاناً الآن 🎉
                                            </button>
                                        ) : (
                                            <Link
                                                href={`/student/subscriptions/${plan._id}/checkout`}
                                                className="block w-full text-center py-3.5 rounded-2xl bg-forest text-white font-extrabold hover:bg-forest-dark transition-colors shadow-lg shadow-forest/20 text-sm"
                                            >
                                                اشترك الآن
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Section 4: Requests History */}
                {requestsHistory.length > 0 && (
                    <div className="bg-white rounded-3xl border border-earth/40 p-6 sm:p-8 shadow-sm">
                        <h3 className="text-xl font-black text-darktext mb-6">سجل طلبات الدفع والاشتراك</h3>
                        <div className="space-y-4">
                            {requestsHistory.map((req: any) => (
                                <div
                                    key={req._id}
                                    className="p-5 rounded-2xl border border-gray-100 bg-offwhite/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="font-extrabold text-darktext text-base">
                                            {req.planId?.name || 'طلب اشتراك'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            طريقة الدفع: {req.paymentMethod} — تاريخ الطلب: {formatDate(req.createdAt)}
                                        </div>
                                        {req.adminNote && req.status === 'rejected' && (
                                            <div className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                                                سبب الرفض: {req.adminNote}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-forest font-mono text-lg">{req.amount} ج.م</span>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'pending'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : req.status === 'approved'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-rose-100 text-rose-800'
                                                }`}
                                        >
                                            {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
