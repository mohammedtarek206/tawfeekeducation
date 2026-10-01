'use client';

/* ─────────────────────────────────────────────────
   INTERACTIVE MAP SECTION
   "العالم بين يديك"
───────────────────────────────────────────────── */

const pins = [
    { id: 'egypt', cx: 52.5, cy: 44.5, label: 'مصر', color: '#C9A227', highlight: true },
    { id: 'rome', cx: 47, cy: 35, label: 'روما', color: '#356B7A' },
    { id: 'athens', cx: 49.5, cy: 37, label: 'أثينا', color: '#356B7A' },
    { id: 'mecca', cx: 56, cy: 49, label: 'مكة', color: '#123C32' },
    { id: 'baghdad', cx: 58, cy: 43, label: 'بغداد', color: '#123C32' },
    { id: 'paris', cx: 44, cy: 31, label: 'باريس', color: '#6B7B76' },
    { id: 'ny', cx: 22, cy: 36, label: 'نيويورك', color: '#6B7B76' },
];

const infoCards = [
    { region: 'أفريقيا', fact: '54 دولة — أكبر قارة من حيث عدد الدول', color: '#C9A227' },
    { region: 'آسيا', fact: 'أكبر قارة مساحةً وسكاناً على وجه الأرض', color: '#356B7A' },
    { region: 'أوروبا', fact: 'مهد الحضارة الغربية وموطن كبرى الإمبراطوريات', color: '#123C32' },
];

export default function BranchesSection() {
    return (
        <section id="map" className="py-24 bg-white relative overflow-hidden">
            {/* Dark topographic BG strip */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(18,60,50,0.03) 0%, transparent 70%)' }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* Header */}
                <div className="text-center mb-14">
                    <div className="section-label justify-center">
                        <span className="w-8 h-px bg-gold" />
                        خريطة تفاعلية
                        <span className="w-8 h-px bg-gold" />
                    </div>
                    <h2 className="section-title text-center">العالم بين يديك</h2>
                    <p className="section-subtitle mx-auto text-center">
                        استكشف العالم من خلال خرائط تفاعلية توضح التضاريس والحضارات والأحداث التاريخية.
                    </p>
                </div>

                {/* Map Container */}
                <div className="relative rounded-3xl overflow-hidden border border-earth/60"
                    style={{ boxShadow: '0 20px 80px -16px rgba(18,60,50,0.18)' }}>

                    {/* Map Background — SVG World Map simplified */}
                    <div className="relative bg-gradient-to-br from-geo/10 via-offwhite to-earth/20 min-h-[420px] md:min-h-[520px] flex items-center justify-center p-8">

                        {/* Grid lines */}
                        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => (
                                <g key={v}>
                                    <line x1={v} y1="0" x2={v} y2="100" stroke="#123C32" strokeWidth="0.3" />
                                    <line x1="0" y1={v} x2="100" y2={v} stroke="#123C32" strokeWidth="0.3" />
                                </g>
                            ))}
                            {/* equator */}
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#C9A227" strokeWidth="0.5" strokeDasharray="1 2" />
                        </svg>

                        {/* Simplified SVG world map */}
                        <svg
                            viewBox="0 0 100 70"
                            className="w-full max-w-4xl relative z-10"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Oceans background */}
                            <rect width="100" height="70" fill="rgba(53,107,122,0.08)" rx="1" />

                            {/* Continents */}
                            {/* North America */}
                            <path d="M5 15 L25 10 L30 18 L28 30 L22 38 L12 40 L8 35 L5 25 Z"
                                fill="rgba(18,60,50,0.25)" stroke="rgba(18,60,50,0.5)" strokeWidth="0.3" />
                            {/* South America */}
                            <path d="M20 42 L30 40 L32 48 L30 58 L22 63 L16 58 L15 50 Z"
                                fill="rgba(18,60,50,0.22)" stroke="rgba(18,60,50,0.5)" strokeWidth="0.3" />
                            {/* Europe */}
                            <path d="M42 15 L55 12 L56 22 L50 26 L42 24 Z"
                                fill="rgba(18,60,50,0.22)" stroke="rgba(18,60,50,0.5)" strokeWidth="0.3" />
                            {/* Africa */}
                            <path d="M44 28 L58 25 L62 35 L60 50 L54 58 L46 55 L40 46 L40 35 Z"
                                fill="rgba(18,60,50,0.22)" stroke="rgba(18,60,50,0.5)" strokeWidth="0.3" />
                            {/* Egypt highlight */}
                            <path d="M50 28 L58 26 L60 32 L54 34 L49 32 Z"
                                fill="rgba(201,162,39,0.45)" stroke="#C9A227" strokeWidth="0.4" />
                            {/* Middle East */}
                            <path d="M58 28 L68 25 L70 33 L62 36 L57 34 Z"
                                fill="rgba(18,60,50,0.2)" stroke="rgba(18,60,50,0.4)" strokeWidth="0.3" />
                            {/* Asia */}
                            <path d="M62 10 L88 8 L92 20 L85 30 L70 28 L60 22 L62 14 Z"
                                fill="rgba(18,60,50,0.22)" stroke="rgba(18,60,50,0.5)" strokeWidth="0.3" />
                            {/* Australia */}
                            <path d="M78 48 L90 46 L92 55 L84 60 L76 57 Z"
                                fill="rgba(18,60,50,0.18)" stroke="rgba(18,60,50,0.4)" strokeWidth="0.3" />

                            {/* Location Pins */}
                            {pins.map(pin => (
                                <g key={pin.id} transform={`translate(${pin.cx},${pin.cy})`}>
                                    {/* Pulse ring for highlighted */}
                                    {pin.highlight && (
                                        <circle r="3" fill={pin.color} opacity="0.2" className="animate-pulse-soft" />
                                    )}
                                    {/* Pin head */}
                                    <circle r={pin.highlight ? 1.8 : 1.2} fill={pin.color} stroke="white" strokeWidth="0.4" />
                                    {/* Label */}
                                    <text
                                        dx={pin.highlight ? 2.5 : 2}
                                        dy="0.5"
                                        fontSize={pin.highlight ? 2.8 : 2}
                                        fill={pin.highlight ? '#C9A227' : 'rgba(29,41,37,0.7)'}
                                        fontFamily="Cairo"
                                        fontWeight={pin.highlight ? 'bold' : 'normal'}
                                    >
                                        {pin.label}
                                    </text>
                                </g>
                            ))}

                            {/* Coordinates watermark */}
                            <text x="1" y="68.5" fontSize="2" fill="rgba(18,60,50,0.25)" fontFamily="monospace">
                                30°02′N 31°14′E — Cairo, Egypt
                            </text>
                        </svg>

                        {/* Floating info cards overlay */}
                        <div className="absolute bottom-4 right-4 md:right-8 flex flex-col gap-3 max-w-xs">
                            {infoCards.slice(0, 2).map(ic => (
                                <div key={ic.region}
                                    className="glass rounded-xl px-4 py-3 shadow-glass border border-white/30 text-right"
                                    style={{ background: 'rgba(247,244,237,0.92)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: ic.color }}>
                                        {ic.region}
                                    </div>
                                    <div className="text-darktext text-xs font-medium leading-snug">{ic.fact}</div>
                                </div>
                            ))}
                        </div>

                        {/* Compass decoration */}
                        <div className="absolute top-4 left-4 md:left-8 opacity-70">
                            <svg viewBox="0 0 60 60" className="w-14 h-14">
                                <circle cx="30" cy="30" r="28" fill="rgba(18,60,50,0.08)" stroke="rgba(18,60,50,0.2)" strokeWidth="1" />
                                <path d="M30 6 L33 28 L30 30 L27 28 Z" fill="#C9A227" />
                                <path d="M30 54 L27 32 L30 30 L33 32 Z" fill="rgba(18,60,50,0.4)" />
                                <path d="M6 30 L28 27 L30 30 L28 33 Z" fill="rgba(18,60,50,0.4)" />
                                <path d="M54 30 L32 33 L30 30 L32 27 Z" fill="rgba(18,60,50,0.4)" />
                                <circle cx="30" cy="30" r="4" fill="#C9A227" />
                                <circle cx="30" cy="30" r="2" fill="white" />
                                <text x="30" y="4" textAnchor="middle" fontSize="5" fill="#C9A227" fontFamily="Cairo" fontWeight="bold">N</text>
                            </svg>
                        </div>
                    </div>

                    {/* Bottom caption bar */}
                    <div className="bg-forest text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs text-earth/70 uppercase tracking-widest mb-0.5">منصة التوفيق</div>
                            <div className="text-sm font-semibold">خرائط تفاعلية لحصص الجغرافيا — قريباً</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-earth/70">
                            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                            قيد التطوير
                        </div>
                    </div>
                </div>

                {/* Region Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                    {infoCards.map(ic => (
                        <div key={ic.region}
                            className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-earth/50"
                            style={{ boxShadow: '0 2px 16px -4px rgba(18,60,50,0.08)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: `${ic.color}15`, color: ic.color }}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-bold text-darktext">{ic.region}</div>
                                <div className="text-sm text-muted mt-0.5 leading-relaxed">{ic.fact}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
