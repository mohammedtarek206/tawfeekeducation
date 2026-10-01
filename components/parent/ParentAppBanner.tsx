'use client';
import { useEffect, useState } from 'react';

declare global {
    interface Window { deferredPrompt: any; }
}

export default function ParentAppBanner() {
    const [show, setShow] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [step, setStep] = useState<'banner' | 'ios-guide'>('banner');

    useEffect(() => {
        // Already installed
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true;
        setIsStandalone(standalone);
        if (standalone) return;

        // Already dismissed this session
        if (sessionStorage.getItem('parent-pwa-dismissed')) return;

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIsIOS(ios);

        if (ios) {
            setTimeout(() => setShow(true), 3000);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShow(true), 3000);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setShow(false);
            setDeferredPrompt(null);
        }
    };

    const dismiss = () => {
        setShow(false);
        sessionStorage.setItem('parent-pwa-dismissed', '1');
    };

    if (!show || isStandalone) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[998]"
                onClick={dismiss}
            />

            {/* Card */}
            <div
                className="fixed bottom-4 left-4 right-4 z-[999] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
                style={{ animation: 'parentBannerIn 0.45s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-earth/20">
                    {/* Header gradient */}
                    <div className="bg-gradient-to-l from-[#123C32] to-[#1e6b52] p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                            onClick={dismiss}
                            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-sm transition"
                        >
                            ✕
                        </button>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-3xl shadow-inner">
                                👨‍👩‍👧‍👦
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white/70 mb-0.5 uppercase tracking-wider">تطبيق جديد</div>
                                <h2 className="font-black text-xl leading-tight">متابعة أبنائك</h2>
                                <p className="text-white/80 text-sm font-medium">منصة التوفيق — ولي الأمر</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        {step === 'banner' ? (
                            <>
                                {/* Feature list */}
                                <div className="space-y-3 mb-5">
                                    {[
                                        { icon: '📊', title: 'متابعة درجات أبنائك', desc: 'راقب نتائج الكويزات والامتحانات فور ظهورها' },
                                        { icon: '⏱️', title: 'تتبع النشاط اليومي', desc: 'اعرف الدروس التي شاهدها ابنك اليوم' },
                                        { icon: '🔔', title: 'إشعارات فورية', desc: 'تنبيه فوري بأي امتحان أو نتيجة جديدة' },
                                    ].map(f => (
                                        <div key={f.title} className="flex items-start gap-3 bg-offwhite rounded-2xl p-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                                                {f.icon}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{f.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {isIOS ? (
                                    <button
                                        onClick={() => setStep('ios-guide')}
                                        className="w-full bg-forest text-white font-black py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md text-base flex items-center justify-center gap-2"
                                    >
                                        <span>📱</span>
                                        كيف أثبّت التطبيق؟
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleInstall}
                                        className="w-full bg-gradient-to-l from-forest to-[#1e6b52] text-white font-black py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md text-base flex items-center justify-center gap-2"
                                    >
                                        <span>📲</span>
                                        تثبيت تطبيق ولي الأمر
                                    </button>
                                )}

                                <p className="text-xs text-center text-gray-400 mt-3 font-medium">
                                    مجاني • لا يحتاج متجر تطبيقات
                                </p>
                            </>
                        ) : (
                            /* iOS Step-by-step guide */
                            <div>
                                <h3 className="font-black text-gray-900 text-base mb-4">
                                    📱 خطوات التثبيت على iPhone
                                </h3>
                                <div className="space-y-3 mb-5">
                                    {[
                                        { num: '١', text: 'افتح هذه الصفحة في متصفح Safari' },
                                        { num: '٢', text: 'اضغط على زر المشاركة ⬆️ في الأسفل' },
                                        { num: '٣', text: 'اختر "إضافة إلى الشاشة الرئيسية"' },
                                        { num: '٤', text: 'اضغط "إضافة" في الأعلى' },
                                    ].map(s => (
                                        <div key={s.num} className="flex items-center gap-3 bg-forest/5 rounded-xl p-3">
                                            <span className="w-8 h-8 bg-forest text-white rounded-full flex items-center justify-center text-sm font-black shrink-0">
                                                {s.num}
                                            </span>
                                            <p className="text-sm text-gray-800 font-medium">{s.text}</p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setStep('banner')}
                                    className="w-full border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm"
                                >
                                    رجوع
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes parentBannerIn {
                    from { opacity: 0; transform: translateY(60px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
