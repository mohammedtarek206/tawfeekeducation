'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Offer {
    id: string;
    type: 'FREE_FIRST_N';
    title: string;
    description: string;
    maximumStudents: number;
    claimedStudents: number;
    remainingStudents: number;
    percentage: number;
    isFull: boolean;
    isActive: boolean;
    durationInDays: number;
    cta: string;
}

export default function OffersSection() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchOffers = useCallback(async () => {
        try {
            const res = await fetch('/api/public/offers', { cache: 'no-store' });
            const data = await res.json();
            if (data.success) setOffers(data.offers || []);
        } catch {
            // صامت — لا نكسر الصفحة
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOffers();
        // تحديث تلقائي كل 30 ثانية لعرض العداد الحقيقي
        const interval = setInterval(fetchOffers, 30_000);
        return () => clearInterval(interval);
    }, [fetchOffers]);

    // إذا لم تكن هناك عروض نشطة، لا نعرض القسم
    if (!loading && offers.length === 0) return null;

    if (loading) {
        return (
            <section className="py-16 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-amber-200/60 rounded-xl w-48 mx-auto mb-6" />
                        <div className="bg-white rounded-3xl shadow-xl p-8">
                            <div className="h-10 bg-amber-100 rounded-xl w-3/4 mx-auto mb-4" />
                            <div className="h-5 bg-gray-100 rounded w-1/2 mx-auto mb-8" />
                            <div className="h-4 bg-amber-100 rounded-full mb-3" />
                            <div className="h-14 bg-amber-200 rounded-2xl w-56 mx-auto mt-6" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="offers" className="py-16 relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #fffbf0 0%, #fff8e1 30%, #fffde7 60%, #f0fff4 100%)'
        }}>
            {/* خلفية زخرفية */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-8 right-12 w-72 h-72 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.4) 0%, transparent 70%)' }} />
                <div className="absolute bottom-8 left-12 w-64 h-64 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, rgba(18,60,50,0.3) 0%, transparent 70%)' }} />
                {/* نجوم ديكور */}
                <div className="absolute top-6 left-1/4 text-2xl opacity-20">✨</div>
                <div className="absolute top-16 right-1/3 text-xl opacity-15">⭐</div>
                <div className="absolute bottom-10 right-1/4 text-2xl opacity-20">🌟</div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* عنوان القسم */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-800 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                        <span className="animate-pulse">🔥</span>
                        العروض الحالية
                    </div>
                    <p className="text-gray-500 text-sm">عروض محدودة المدة — لا تفوّت الفرصة</p>
                </div>

                {/* بطاقات العروض */}
                <div className="space-y-6">
                    {offers.map((offer) => (
                        <OfferCard key={offer.id} offer={offer} onClaim={() => router.push('/register')} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function OfferCard({ offer, onClaim }: { offer: Offer; onClaim: () => void }) {
    const progressWidth = Math.min(100, offer.percentage);
    const urgencyLevel = offer.percentage >= 90 ? 'critical' : offer.percentage >= 70 ? 'high' : 'normal';

    const progressColor = offer.isFull
        ? '#6b7280'
        : urgencyLevel === 'critical'
            ? '#ef4444'
            : urgencyLevel === 'high'
                ? '#f97316'
                : '#16a34a';

    return (
        <div className="relative bg-white rounded-3xl overflow-hidden"
            style={{
                boxShadow: offer.isFull
                    ? '0 4px 24px -8px rgba(0,0,0,0.1)'
                    : '0 20px 60px -12px rgba(201,162,39,0.25), 0 4px 24px -8px rgba(18,60,50,0.1)',
                border: offer.isFull ? '1.5px solid #e5e7eb' : '1.5px solid rgba(201,162,39,0.3)',
            }}>

            {/* شريط علوي ذهبي */}
            {!offer.isFull && (
                <div className="h-1.5 w-full"
                    style={{ background: 'linear-gradient(90deg, #C9A227, #F59E0B, #C9A227)' }} />
            )}

            <div className="p-8 md:p-10">
                {/* Badge الحالة */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${offer.isFull
                        ? 'bg-gray-100 text-gray-500'
                        : urgencyLevel === 'critical'
                            ? 'bg-red-100 text-red-600 animate-pulse'
                            : urgencyLevel === 'high'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-green-100 text-green-700'
                        }`}>
                        {offer.isFull ? '🔒 اكتمل العرض' : urgencyLevel === 'critical' ? '⚡ أوشك على الامتلاء' : urgencyLevel === 'high' ? '🔥 مقاعد محدودة' : '✅ متاح الآن'}
                    </div>
                    {offer.durationInDays > 0 && !offer.isFull && (
                        <div className="text-xs text-gray-400 font-medium">
                            مدة الاشتراك المجاني: {formatDuration(offer.durationInDays)}
                        </div>
                    )}
                </div>

                {/* العنوان */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-black mb-3"
                        style={{ color: offer.isFull ? '#6b7280' : '#1a1a1a' }}>
                        {offer.title}
                    </h2>
                    <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
                        {offer.description}
                    </p>
                </div>

                {/* عداد المقاعد */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black" style={{ color: progressColor }}>
                                {offer.claimedStudents}
                            </span>
                            <span className="text-gray-400 font-medium text-lg"> / </span>
                            <span className="text-2xl font-black text-gray-700">
                                {offer.maximumStudents}
                            </span>
                        </div>
                        <div className="text-sm font-bold" style={{ color: progressColor }}>
                            {offer.isFull ? 'امتلأ العرض' : `متبقي ${offer.remainingStudents} مكان`}
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-3 font-medium">
                        تم حجز {offer.claimedStudents} من {offer.maximumStudents} مقعد
                    </p>

                    {/* شريط التقدم */}
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: `${progressWidth}%`,
                                background: offer.isFull
                                    ? '#9ca3af'
                                    : `linear-gradient(90deg, ${progressColor}, ${progressColor}cc)`,
                            }}
                        />
                        {/* نقطة متحركة */}
                        {!offer.isFull && progressWidth > 5 && (
                            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg border-2 border-white transition-all duration-1000"
                                style={{ left: `calc(${progressWidth}% - 8px)`, background: progressColor }} />
                        )}
                    </div>

                    <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>0</span>
                        <span className="font-bold" style={{ color: progressColor }}>{offer.percentage}%</span>
                        <span>{offer.maximumStudents}</span>
                    </div>
                </div>

                {/* زر العمل */}
                <div className="text-center">
                    {offer.isFull ? (
                        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-8 py-4 rounded-2xl font-bold text-lg cursor-not-allowed">
                            🔒 انتهى العرض
                        </div>
                    ) : (
                        <button
                            onClick={onClaim}
                            id="offer-claim-btn"
                            className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #C9A227, #F59E0B)',
                                boxShadow: '0 8px 32px -8px rgba(201,162,39,0.6)',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px -8px rgba(201,162,39,0.7)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px -8px rgba(201,162,39,0.6)';
                            }}
                        >
                            <span className="relative z-10">{offer.cta}</span>
                            <svg className="w-5 h-5 relative z-10 transition-transform group-hover:-translate-x-1 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            {/* تأثير لمعان */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                        </button>
                    )}
                    {!offer.isFull && (
                        <p className="mt-3 text-xs text-gray-400">
                            🔒 العرض محفوظ فقط للطلاب الذين يُكملون التسجيل
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatDuration(days: number): string {
    if (days >= 365) return `${Math.round(days / 365)} سنة`;
    if (days >= 90) return `ترم دراسي (${days} يوم)`;
    if (days >= 30) return `${Math.round(days / 30)} شهر`;
    return `${days} يوم`;
}
