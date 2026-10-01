'use client';

import Link from 'next/link';

/* ──────────────────────────────────────────────────────────────
   GeoBackground — SVG contour lines + lat/lon grid
────────────────────────────────────────────────────────────── */
function GeoBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Lat/Lon grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="geo-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#123C32" strokeWidth="0.8" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#geo-grid)" />
            </svg>

            {/* Contour ellipses — decorative */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="1100" cy="350" rx="420" ry="280" fill="none" stroke="#C9A227" strokeWidth="1.5" />
                <ellipse cx="1100" cy="350" rx="340" ry="210" fill="none" stroke="#C9A227" strokeWidth="1" />
                <ellipse cx="1100" cy="350" rx="260" ry="150" fill="none" stroke="#123C32" strokeWidth="1.2" />
                <ellipse cx="1100" cy="350" rx="180" ry="100" fill="none" stroke="#123C32" strokeWidth="1" />
                <ellipse cx="1100" cy="350" rx="100" ry="60" fill="none" stroke="#356B7A" strokeWidth="1" />
                {/* Left decorative contours */}
                <ellipse cx="200" cy="600" rx="260" ry="180" fill="none" stroke="#356B7A" strokeWidth="1" />
                <ellipse cx="200" cy="600" rx="180" ry="120" fill="none" stroke="#123C32" strokeWidth="0.8" />
            </svg>

            {/* Radial glow top-right */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.07) 0%, transparent 70%)' }} />
            {/* Radial glow bottom-left */}
            <div className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(53,107,122,0.08) 0%, transparent 70%)' }} />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   TeacherImage — The teacher's portrait
────────────────────────────────────────────────────────────── */
function TeacherImage() {
    return (
        <div className="relative flex items-center justify-center animate-fadeInUp">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full opacity-20 animate-pulse-soft"
                style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.5) 0%, transparent 70%)', transform: 'scale(1.15)' }} />

            {/* Image Container with premium frame */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl z-10 max-w-sm md:max-w-md lg:max-w-[400px] w-full"
                style={{ boxShadow: '0 32px 80px -16px rgba(18,60,50,0.35), 0 0 0 4px #fff, 0 0 0 6px rgba(201,162,39,0.3)' }}>
                {/* Gold border overlay */}
                <div className="absolute inset-0 rounded-[2rem] border-2 border-gold/30 z-20 pointer-events-none" />
                {/* Image */}
                <img
                    src="/mr-attia.jpg"
                    alt="مستر أبو زيد - خبير الجغرافيا والتاريخ"
                    className="w-full h-auto object-cover object-center block"
                    style={{ aspectRatio: '9/16' }}
                    onError={(e) => {
                        // Fallback if image not found yet
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                {/* Bottom gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 z-10"
                    style={{ background: 'linear-gradient(to top, rgba(12,40,32,0.7) 0%, transparent 100%)' }}>
                    <div className="absolute bottom-4 inset-x-0 text-center">
                        <div className="text-white font-black text-lg">مستر أبو زيد</div>
                        <div className="text-gold text-sm font-semibold">التوفيق معك لآخر الطريق ✨</div>
                    </div>
                </div>
            </div>

            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/25 rounded-full blur-2xl z-0" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-forest/25 rounded-full blur-2xl z-0" />

            {/* Floating info card — top right */}
            <div className="absolute top-8 -right-4 md:-right-12 glass-dark rounded-2xl px-4 py-3 shadow-xl border border-white/10 animate-float z-20"
                style={{ animationDelay: '0.8s' }}>
                <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">خبير المادة</div>
                <div className="text-white font-bold text-sm mb-0.5">مستر / أبو زيد</div>
                <div className="flex items-center gap-1.5">
                    <span className="text-gold text-xs">⭐⭐⭐⭐⭐</span>
                </div>
            </div>

            {/* Floating info card — bottom left */}
            <div className="absolute bottom-20 -left-4 md:-left-12 glass rounded-2xl px-4 py-3 shadow-xl border border-white/20 animate-float z-20"
                style={{ animationDelay: '1.5s' }}>
                <div className="text-[10px] text-forest font-black mb-1.5">✏️ يدرّس:</div>
                <div className="flex flex-col gap-1">
                    <span className="bg-forest/10 text-forest text-xs font-semibold px-2.5 py-1 rounded-lg">الإعدادية</span>
                    <span className="bg-forest/10 text-forest text-xs font-semibold px-2.5 py-1 rounded-lg">الثانوية العامة</span>
                    <span className="bg-gold/10 text-gold-dark text-xs font-semibold px-2.5 py-1 rounded-lg">البكالوريا</span>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   StatBadge
────────────────────────────────────────────────────────────── */
function StatBadge({ number, label, icon }: { number: string; label: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center text-forest flex-shrink-0">
                {icon}
            </div>
            <div>
                <div className="text-xl font-black text-forest">{number}</div>
                <div className="text-xs text-muted font-medium">{label}</div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   HERO SECTION
────────────────────────────────────────────────────────────── */
export default function HeroSection() {
    return (
        <section
            id="hero"
            className="relative min-h-screen flex items-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F7F4ED 0%, #EDE5D5 45%, #F2EDE5 100%)' }}
        >
            <GeoBackground />

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    {/* ── Text Side (RTL: right column first) ── */}
                    <div className="order-2 lg:order-1 text-right">

                        {/* Label chip */}
                        <div className="inline-flex items-center gap-2 bg-forest/10 text-forest text-xs font-bold px-4 py-2 rounded-full mb-6 animate-fadeInDown">
                            <svg className="w-3.5 h-3.5 text-gold animate-rotateSlow" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                <path d="M12 6l1.5 4.5H18l-3.75 2.73 1.43 4.39L12 15.18l-3.68 2.44 1.43-4.39L6 10.5h4.5z" />
                            </svg>
                            استكشف • افهم • اكتشف
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-darktext leading-tight mb-5 animate-fadeInUp stagger-1 flex flex-col gap-2">
                            <span>التوفيق معك</span>
                            <span className="block relative">
                                <span className="text-gold">لآخر الطريق</span>
                                <svg className="absolute -bottom-3 right-0 left-0 w-3/4 max-w-[300px]" height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                                    <path d="M0 6 Q100 0 200 6" stroke="#C9A227" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
                                </svg>
                            </span>
                        </h1>

                        {/* Supporting copy */}
                        <p className="text-darktext/65 text-lg leading-relaxed mb-8 max-w-xl animate-fadeInUp stagger-2 font-medium">
                            انضم لآلاف الطلاب في أضخم منصة تعليمية لمادتي الدراسات الاجتماعية والتاريخ مع الخبير <strong className="text-forest">مستر أبو زيد</strong>. ابدأ رحلة التفوق الآن.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 mb-10 animate-fadeInUp stagger-3">
                            <Link href="/register" className="btn-gold btn-lg shadow-gold">
                                ابدأ رحلة التعلم
                                <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                            <Link href="#subjects" className="btn-outline btn-lg">
                                استكشف المواد
                            </Link>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-6 pt-6 border-t border-earth animate-fadeInUp stagger-4">
                            <StatBadge
                                number="2"
                                label="مرحلة دراسية (إعدادي + ثانوي)"
                                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                            />
                            <StatBadge
                                number="+100"
                                label="درس وفيديو تعليمي"
                                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                            <StatBadge
                                number="+50"
                                label="اختبار تفاعلي"
                                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
                            />
                        </div>
                    </div>

                    {/* ── Visual Side ── */}
                    <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                        <TeacherImage />
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-60">
                <span className="text-xs text-forest/60 font-medium tracking-widest">اكتشف أكثر</span>
                <div className="w-5 h-8 border-2 border-forest/30 rounded-full flex justify-center pt-1.5">
                    <div className="w-1 h-2 bg-gold rounded-full animate-pulse" />
                </div>
            </div>
        </section>
    );
}
