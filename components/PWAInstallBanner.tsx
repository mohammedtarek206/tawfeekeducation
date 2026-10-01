'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Extend Window to include deferredPrompt
declare global {
    interface Window {
        deferredPrompt: any;
    }
}

export default function PWAInstallBanner() {
    const pathname = usePathname();
    const [show, setShow] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [dismissed, setDismissed] = useState(false);

    // Don't show on parent pages — they have their own banner
    const isParentPage = pathname?.startsWith('/parent');

    useEffect(() => {
        if (isParentPage) return;

        // Check if already installed (standalone mode)
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true;
        setIsStandalone(standalone);
        if (standalone) return;

        // Check if already dismissed
        const alreadyDismissed = sessionStorage.getItem('pwa-dismissed');
        if (alreadyDismissed) return;

        // Detect iOS
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);

        if (ios) {
            // iOS doesn't fire beforeinstallprompt; show manual guide
            setTimeout(() => setShow(true), 2500);
            return;
        }

        // Handle Chrome/Edge/Android install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShow(true), 2500);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShow(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShow(false);
        setDismissed(true);
        sessionStorage.setItem('pwa-dismissed', '1');
    };

    if (!show || isStandalone || dismissed || isParentPage) return null;

    return (
        <>
            {/* Backdrop blur on mobile */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[998] lg:hidden"
                onClick={handleDismiss}
            />

            {/* Banner */}
            <div
                className={`
                    fixed z-[999] transition-all duration-500 ease-out
                    bottom-4 left-4 right-4
                    lg:bottom-6 lg:left-6 lg:right-auto lg:max-w-sm
                    animate-slideUp
                `}
                style={{ animation: 'slideUp 0.4s ease-out' }}
            >
                <div className="bg-white rounded-3xl shadow-2xl border border-earth/20 overflow-hidden">
                    {/* Green accent top bar */}
                    <div className="h-1 bg-gradient-to-r from-forest to-forest-light" />

                    <div className="p-5">
                        <div className="flex items-start gap-4">
                            {/* App Icon */}
                            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-forest/10">
                                <img src="/لوجو.jpg" alt="التوفيق" className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-black text-gray-900 text-base leading-tight">
                                            تطبيق منصة التوفيق
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                            ثبّت التطبيق للوصول الفوري
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleDismiss}
                                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 shrink-0 transition-colors mt-0.5"
                                        aria-label="إغلاق"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
                            {[
                                { icon: '⚡', text: 'سريع' },
                                { icon: '📴', text: 'بدون نت' },
                                { icon: '🔔', text: 'إشعارات' },
                            ].map((f) => (
                                <div key={f.text} className="bg-forest/5 rounded-xl p-2 text-center">
                                    <div className="text-lg">{f.icon}</div>
                                    <div className="text-xs font-bold text-forest mt-0.5">{f.text}</div>
                                </div>
                            ))}
                        </div>

                        {isIOS ? (
                            /* iOS Manual Guide */
                            <div className="bg-blue-50 rounded-2xl p-3 text-sm text-blue-800 font-medium leading-relaxed">
                                <p className="font-bold mb-1">📱 طريقة التثبيت على iPhone/iPad:</p>
                                <ol className="space-y-1 text-xs">
                                    <li>1️⃣ اضغط زر <strong>مشاركة</strong> <span className="text-base">⬆️</span> في Safari</li>
                                    <li>2️⃣ اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></li>
                                    <li>3️⃣ اضغط <strong>"إضافة"</strong></li>
                                </ol>
                            </div>
                        ) : (
                            /* Android/Desktop Install Button */
                            <button
                                onClick={handleInstall}
                                className="w-full bg-forest text-white font-black py-3.5 rounded-2xl hover:bg-forest-light active:scale-95 transition-all shadow-md text-base flex items-center justify-center gap-2"
                            >
                                <span>📲</span>
                                تثبيت التطبيق مجاناً
                            </button>
                        )}

                        <p className="text-xs text-center text-gray-400 mt-2">
                            لا يتطلب متجر التطبيقات • مجاناً تماماً
                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
