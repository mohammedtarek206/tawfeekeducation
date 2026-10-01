'use client';

import Link from 'next/link';

export default function CTASection() {
    return (
        <section
            id="cta"
            className="py-32 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0c2820 0%, #123C32 55%, #1a3a44 100%)' }}
        >
            {/* Decorative contour rings */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">
                    <ellipse cx="720" cy="300" rx="680" ry="280" fill="none" stroke="#D8C3A5" strokeWidth="1.5" />
                    <ellipse cx="720" cy="300" rx="540" ry="220" fill="none" stroke="#D8C3A5" strokeWidth="1" />
                    <ellipse cx="720" cy="300" rx="400" ry="160" fill="none" stroke="#C9A227" strokeWidth="1.2" />
                    <ellipse cx="720" cy="300" rx="270" ry="110" fill="none" stroke="#C9A227" strokeWidth="1" />
                    <ellipse cx="720" cy="300" rx="140" ry="60" fill="none" stroke="#356B7A" strokeWidth="1" />
                </svg>

                {/* Lat/Lon overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="cta-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#D8C3A5" strokeWidth="0.6" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cta-grid)" />
                </svg>

                {/* Radial glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.5) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center"
                    style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.3)' }}>
                    <svg className="w-10 h-10 text-gold" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M24 8 L27 22 L24 24 L21 22 Z" fill="currentColor" />
                        <path d="M24 40 L21 26 L24 24 L27 26 Z" fill="currentColor" opacity="0.5" />
                        <circle cx="24" cy="24" r="4" fill="currentColor" />
                        <circle cx="24" cy="24" r="2" fill="#123C32" />
                    </svg>
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-5 leading-tight">
                    مستعد تبدأ رحلة التفوق؟
                </h2>
                <p className="text-earth/80 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                    تعلّم، اختبر نفسك، وتفوق في الدراسات الاجتماعية والتاريخ مع الخبير مستر أبو زيد.
                </p>

                <div className="flex flex-wrap gap-5 justify-center">
                    <Link
                        href="/register"
                        id="cta-register-btn"
                        className="btn-gold btn-lg shadow-gold"
                    >
                        ابدأ الآن
                        <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                    <Link
                        href="#how"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white text-lg font-semibold transition-colors px-4 py-3.5 rounded-xl hover:bg-white/8"
                    >
                        كيف تعمل المنصة؟
                    </Link>
                </div>

                {/* Subtle trust indicators */}
                <div className="flex flex-wrap justify-center gap-8 mt-14 pt-10 border-t border-white/10">
                    {[
                        { icon: '🔒', label: 'بيانات آمنة' },
                        { icon: '📱', label: 'متوافق مع الجوال' },
                        { icon: '⭐', label: 'تجربة متميزة' },
                    ].map(t => (
                        <div key={t.label} className="flex items-center gap-2 text-earth/60 text-sm">
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
