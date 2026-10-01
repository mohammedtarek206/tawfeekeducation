'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PendingContent() {
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');

    return (
        <div className="min-h-screen bg-offwhite flex items-center justify-center p-4 relative overflow-hidden">
            {/* Geographic Decorative Background */}
            <div className="absolute inset-0 pointer-events-none geo-grid-bg opacity-50" aria-hidden="true" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 60%)' }} />

            <div className="relative z-10 w-full max-w-md bg-white border border-earth/60 rounded-3xl p-8 text-center text-darktext animate-fadeInUp shadow-forest">
                {/* Status Icon */}
                <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-offwhite relative" style={{ background: '#F7F4ED', boxShadow: '0 8px 32px -8px rgba(201,162,39,0.3)' }}>
                    <svg className="w-10 h-10 text-gold animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {/* Pulsing ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-gold opacity-50 animate-pulse-soft" style={{ transform: 'scale(1.15)' }}></div>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-4 border border-amber-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                    قيد المراجعة
                </div>

                <h1 className="text-2xl font-black text-forest mb-4">تم استلام طلبك بنجاح</h1>

                <div className="bg-offwhite rounded-xl p-5 mb-8 border border-earth/40 text-right">
                    <p className="text-darktext/90 font-medium text-sm leading-relaxed mb-3 flex items-start gap-2">
                        <svg className="w-5 h-5 text-forest shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>حسابك الآن قيد المراجعة من قِبل إدارة المنصة.</span>
                    </p>
                    {planId && (
                        <p className="text-forest font-bold text-sm leading-relaxed mb-3 flex items-start gap-2 bg-forest/5 p-3 rounded-lg border border-forest/20">
                            <span>💡 يمكنك استكمال الاشتراك بعد الموافقة على الحساب. تم حفظ الباقة المختارة.</span>
                        </p>
                    )}
                    <p className="text-muted text-sm leading-relaxed flex items-start gap-2">
                        <svg className="w-5 h-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>سيتم إشعارك فور تفعيل حسابك، وعادةً ما يستغرق ذلك أقل من 24 ساعة.</span>
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Link href={`/login${planId ? `?planId=${planId}` : ''}`} className="btn-primary w-full">
                        العودة لتسجيل الدخول
                    </Link>
                    <Link href="/" className="btn-ghost w-full">
                        ← العودة للصفحة الرئيسية
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function PendingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-offwhite flex items-center justify-center p-4">جاري التحميل...</div>}>
            <PendingContent />
        </Suspense>
    );
}
