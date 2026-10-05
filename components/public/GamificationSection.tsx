'use client';

import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────
   GAMIFICATION SECTION — contains:
   1. Learning Experience cards
   2. History Timeline
   3. Points & Rewards
   4. First 100 Students
   5. How It Works
   6. Referral
   7. Testimonials
   8. FAQ
───────────────────────────────────────────────────────────────────── */

/* ---------- Learning Experience ---------- */
const learningCards = [
    {
        icon: '▶',
        title: 'فيديوهات شرح',
        desc: 'شرح واضح ومبسط لكل درس مع أمثلة وتطبيقات.',
        color: '#123C32',
    },
    {
        icon: '💡',
        title: 'فيديوهات حل',
        desc: 'تطبيق عملي على أهم الأسئلة والنماذج التاريخية.',
        color: '#356B7A',
    },
    {
        icon: '✍',
        title: 'Quiz بعد كل حصة',
        desc: 'اختبر فهمك مباشرة بعد انتهاء كل فيديو تعليمي.',
        color: '#C9A227',
    },
    {
        icon: '📅',
        title: 'امتحانات أسبوعية',
        desc: 'تابع مستواك باستمرار وتحسّن تدريجياً.',
        color: '#123C32',
    },
    {
        icon: '🏆',
        title: 'امتحانات شهرية',
        desc: 'اختبر تقدمك بشكل شامل وقيّم مستواك الدراسي.',
        color: '#C9A227',
    },
];

/* ---------- Timeline ---------- */
const timeline = [
    {
        period: '3100 – 332 ق.م',
        title: 'الحضارة المصرية القديمة',
        desc: 'من توحيد القطرين إلى الفتح الإسكندري — آلاف السنين من البناء والإبداع.',
        color: '#C9A227',
        icon: '𓂀',
    },
    {
        period: '332 ق.م – 642 م',
        title: 'العصر اليوناني والروماني',
        desc: 'الإسكندرية مركزاً للعلم والفلسفة، ومصر جوهرة التاج الروماني.',
        color: '#356B7A',
        icon: '🏛',
    },
    {
        period: '642 – 1517 م',
        title: 'العصر الإسلامي',
        desc: 'الفتح الإسلامي وازدهار الحضارة العربية في القاهرة وبغداد والأندلس.',
        color: '#123C32',
        icon: '☾',
    },
    {
        period: '1517 – حاضراً',
        title: 'العصر الحديث',
        desc: 'من الحملة الفرنسية والنهضة المصرية إلى ثورة الاتصالات والمعلومات.',
        color: '#6B7B76',
        icon: '⚙',
    },
];

/* ---------- Steps ---------- */
const steps = [
    { num: '01', title: 'سجّل حسابك', desc: 'أنشئ حسابك بسرعة ببياناتك الأساسية.' },
    { num: '02', title: 'أكّد رقم هاتفك', desc: 'سنرسل لك رمز OTP للتحقق من هويتك.' },
    { num: '03', title: 'انتظر موافقة الإدارة', desc: 'تراجع الإدارة طلبك في أقرب وقت.' },
    { num: '04', title: 'ابدأ رحلة التعلم', desc: 'ادخل المنصة واستكشف عالم المعرفة.' },
];

/* ---------- Testimonials ---------- */
const testimonials = [
    { name: 'أحمد م.', grade: 'الصف الثالث الإعدادي', text: 'المنصة غيّرت طريقة دراستي للدراسات الاجتماعية تماماً. الشرح واضح والاختبارات بتساعدني أتأكد من فهمي.' },
    { name: 'سارة ك.', grade: 'الصف الثاني الإعدادي', text: 'أخيراً قدرت أفهم التاريخ بطريقة ممتعة. التسلسل الزمني بالمنصة رائع.' },
    { name: 'كريم ط.', grade: 'الصف الأول الإعدادي', text: 'نظام النقاط بحفزني دايماً أكمل الدروس وأحل الاختبارات. المنصة احترافية جداً.' },
];

/* ---------- FAQ ---------- */
const faqs = [
    { q: 'كيف أسجّل؟', a: 'اضغط على زر "ابدأ الآن" وأدخل بياناتك. ستصلك رسالة تأكيد على هاتفك.' },
    { q: 'كيف يتم تفعيل الحساب؟', a: 'بعد التسجيل والتحقق من رقم هاتفك، تراجع الإدارة طلبك وتُفعّل حسابك خلال 24 ساعة.' },
    { q: 'هل الاشتراك مجاني؟', a: 'أول 100 طالب يحصلون على اشتراك مجاني كامل. بعد ذلك ستُتاح باقات الاشتراك المدفوعة.' },
    { q: 'كيف أحصل على النقاط؟', a: 'تحصل على نقاط بإكمال الدروس، حل الكويزات، اجتياز الامتحانات، ودعوة الأصدقاء.' },
    { q: 'كيف أشارك المنصة مع أصدقائي؟', a: 'من قسم "الإحالة" في حسابك، انسخ رابطك الخاص وشاره عبر واتساب أو أي وسيلة تواصل.' },
    { q: 'متى تظهر الاختبارات؟', a: 'الكويزات تظهر فور انتهاء الفيديو. الامتحانات الأسبوعية تُفتح نهاية كل أسبوع.' },
    { q: 'كيف أتابع تقدمي؟', a: 'من لوحة التحكم الخاصة بك يمكنك متابعة نسبة إتمام الدروس، درجاتك، ومرتبتك.' },
];

/* ─── Components ─── */

function LearningCard({ card }: { card: typeof learningCards[0] }) {
    return (
        <div className="group bg-white border border-earth/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 text-right"
            style={{ boxShadow: '0 2px 16px -4px rgba(18,60,50,0.08)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px -8px ${card.color}22`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px -4px rgba(18,60,50,0.08)'; }}
        >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl"
                style={{ background: `${card.color}12`, color: card.color }}>
                {card.icon}
            </div>
            <h3 className="font-black text-darktext text-lg mb-2">{card.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{card.desc}</p>
        </div>
    );
}

function TimelineBlock({ item, isLast }: { item: typeof timeline[0], isLast: boolean }) {
    return (
        <div className="relative flex-1 min-w-[200px] text-right group">
            {/* Connector line */}
            {!isLast && (
                <div className="absolute top-5 left-0 w-full h-px hidden md:block"
                    style={{ background: `linear-gradient(90deg, ${item.color}50, ${item.color}10)` }} />
            )}

            {/* Dot */}
            <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mb-md:mx-auto transition-transform group-hover:scale-110"
                style={{ background: item.color }}>
                <span>{item.icon}</span>
            </div>

            <div className="text-xs font-bold tracking-widest mb-1" style={{ color: item.color }}>{item.period}</div>
            <h3 className="font-black text-darktext text-base mb-2 leading-tight">{item.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
        </div>
    );
}

function FaqItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
    return (
        <details
            className={`group ${!isLast ? 'border-b border-earth/50' : ''}`}
        >
            <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none select-none text-right">
                <span className="font-bold text-darktext group-open:text-forest transition-colors">{q}</span>
                <div className="w-7 h-7 rounded-full border border-earth flex items-center justify-center flex-shrink-0 text-forest transition-all group-open:rotate-45 group-open:border-forest group-open:bg-forest group-open:text-white">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
            </summary>
            <div className="pb-5 text-muted text-sm leading-relaxed text-right">{a}</div>
        </details>
    );
}

/* ────────────────────────────────────────────────────────────────────
   MAIN EXPORT — GamificationSection (renamed but same file role)
   Contains all mid-page sections
──────────────────────────────────────────────────────────────────── */
export default function GamificationSection() {
    return (
        <>
            {/* 1. LEARNING EXPERIENCE ─────────────────────────────────── */}
            <section id="learning" className="py-24 bg-offwhite relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none geo-grid-bg opacity-50" aria-hidden="true" />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <div className="section-label justify-center">
                            <span className="w-8 h-px bg-gold" />
                            منهجية التعلم
                            <span className="w-8 h-px bg-gold" />
                        </div>
                        <h2 className="section-title text-center">تجربة تعلم متكاملة</h2>
                        <p className="section-subtitle mx-auto text-center">
                            منظومة تعليمية شاملة — من الشرح إلى التقييم في كل درس.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {learningCards.map(c => <LearningCard key={c.title} card={c} />)}
                    </div>
                </div>
            </section>

            {/* 2. HISTORY TIMELINE ─────────────────────────────────────── */}
            <section id="timeline" className="py-24 bg-white relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute inset-0 opacity-30"
                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.08) 0%, transparent 60%)' }} />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <div className="section-label justify-center">
                            <span className="w-8 h-px bg-gold" />
                            التسلسل الزمني
                            <span className="w-8 h-px bg-gold" />
                        </div>
                        <h2 className="section-title text-center">رحلة عبر التاريخ</h2>
                        <p className="section-subtitle mx-auto text-center">
                            من فجر الحضارة المصرية إلى يومنا هذا — الماضي مفتاح الحاضر والمستقبل.
                        </p>
                    </div>

                    {/* Desktop timeline */}
                    <div className="hidden md:flex gap-6 lg:gap-8 items-start">
                        {timeline.map((item, i) => (
                            <TimelineBlock key={item.title} item={item} isLast={i === timeline.length - 1} />
                        ))}
                    </div>

                    {/* Mobile timeline */}
                    <div className="md:hidden space-y-0">
                        {timeline.map((item, i) => (
                            <div key={item.title} className="relative flex gap-5 pb-8">
                                {/* Vertical line */}
                                {i < timeline.length - 1 && (
                                    <div className="absolute right-4 top-10 bottom-0 w-px"
                                        style={{ background: `linear-gradient(${item.color}60, ${timeline[i + 1].color}30)` }} />
                                )}
                                {/* Dot */}
                                <div className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                    style={{ background: item.color }}>
                                    <span className="text-base">{item.icon}</span>
                                </div>
                                <div className="flex-1 pt-1 text-right">
                                    <div className="text-[11px] font-bold tracking-widest mb-0.5" style={{ color: item.color }}>{item.period}</div>
                                    <h3 className="font-black text-darktext text-base mb-1.5">{item.title}</h3>
                                    <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. STUDENT DASHBOARD PREVIEW ─────────────────────────────── */}
            <section id="dashboard" className="py-24 bg-offwhite relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none geo-grid-bg opacity-40" aria-hidden="true" />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
                        {/* Text side */}
                        <div className="text-right">
                            <div className="section-label">
                                <span className="w-8 h-px bg-gold" />
                                لوحة التحكم
                            </div>
                            <h2 className="section-title">تابع رحلتك التعليمية</h2>
                            <p className="text-muted leading-relaxed mb-8">
                                لوحة تحكم شخصية تعرض تقدمك بشكل بصري — من نسبة الإنجاز إلى النقاط والمرتبة.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    { label: 'نسبة الإتمام', val: 'إجمالي الدروس المكتملة', color: '#123C32' },
                                    { label: 'درجات الكويز', val: 'تقييم فوري بعد كل حصة', color: '#356B7A' },
                                    { label: 'النقاط والمرتبة', val: 'تنافس وحقق مراكز متقدمة', color: '#C9A227' },
                                ].map(item => (
                                    <li key={item.label} className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}12` }}>
                                            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-darktext text-sm">{item.label}</div>
                                            <div className="text-xs text-muted">{item.val}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Dashboard mockup */}
                        <div className="bg-white rounded-3xl border border-earth/60 overflow-hidden"
                            style={{ boxShadow: '0 20px 80px -16px rgba(18,60,50,0.15)' }}>
                            {/* Mock header */}
                            <div className="bg-forest px-6 py-4 flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-earth/70">مرحباً</div>
                                    <div className="text-white font-bold">أحمد محمد</div>
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                                    <span className="text-gold text-sm font-black">⭐ 850</span>
                                    <span className="text-white/60 text-xs">نقطة</span>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Progress cards */}
                                {[
                                    { label: 'المراجعات والتطبيقات', prog: 65, color: '#356B7A', lessons: '14/22' },
                                    { label: 'التاريخ', prog: 40, color: '#C9A227', lessons: '8/20' },
                                    { label: 'الدراسات الاجتماعية', prog: 20, color: '#123C32', lessons: '4/18' },
                                ].map(subject => (
                                    <div key={subject.label}>
                                        <div className="flex items-center justify-between text-sm mb-1.5">
                                            <span className="font-semibold text-darktext">{subject.label}</span>
                                            <span className="text-muted text-xs">{subject.lessons} درس</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${subject.prog}%`, background: subject.color }} />
                                        </div>
                                        <div className="text-xs mt-1 text-left font-semibold" style={{ color: subject.color }}>{subject.prog}%</div>
                                    </div>
                                ))}

                                {/* Quick stats */}
                                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-earth/40">
                                    {[
                                        { v: '26', l: 'درس مكتمل', c: '#123C32' },
                                        { v: '89%', l: 'معدل الكويز', c: '#356B7A' },
                                        { v: '#12', l: 'مرتبتك', c: '#C9A227' },
                                    ].map(s => (
                                        <div key={s.l} className="text-center p-3 rounded-xl" style={{ background: `${s.c}08` }}>
                                            <div className="text-xl font-black" style={{ color: s.c }}>{s.v}</div>
                                            <div className="text-[10px] text-muted">{s.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. POINTS & REWARDS ─────────────────────────────────────── */}
            <section id="points" className="py-24 bg-white relative overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <div className="section-label justify-center">
                            <span className="w-8 h-px bg-gold" />
                            نظام النقاط
                            <span className="w-8 h-px bg-gold" />
                        </div>
                        <h2 className="section-title text-center">كل خطوة لها قيمة</h2>
                        <p className="section-subtitle mx-auto text-center">
                            اكسب نقاطاً مع كل خطوة في رحلتك التعليمية وارتقِ في مستويات التميّز.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { action: 'أكمل درساً', xp: '+10 XP', color: '#123C32', icon: '📖' },
                            { action: 'اجتز الكويز', xp: '+25 XP', color: '#356B7A', icon: '✅' },
                            { action: 'اجتز الامتحان', xp: '+50 XP', color: '#C9A227', icon: '🏆' },
                            { action: 'ادعُ صديقاً', xp: '+100 XP', color: '#123C32', icon: '👥' },
                        ].map(item => (
                            <div key={item.action}
                                className="group text-center bg-white border border-earth/50 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                                style={{ boxShadow: '0 2px 16px -4px rgba(18,60,50,0.08)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px -8px ${item.color}25`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px -4px rgba(18,60,50,0.08)'; }}
                            >
                                <div className="text-4xl mb-4">{item.icon}</div>
                                <div className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">{item.action}</div>
                                <div className="text-3xl font-black" style={{ color: item.color }}>{item.xp}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. FIRST 100 STUDENTS ───────────────────────────────────── */}
            <section id="offer" className="py-24 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0c2820 0%, #123C32 55%, #1a4438 100%)' }}>
                {/* Contour pattern overlay */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                        <ellipse cx="400" cy="200" rx="350" ry="180" fill="none" stroke="#D8C3A5" strokeWidth="1.5" />
                        <ellipse cx="400" cy="200" rx="270" ry="135" fill="none" stroke="#D8C3A5" strokeWidth="1" />
                        <ellipse cx="400" cy="200" rx="190" ry="90" fill="none" stroke="#C9A227" strokeWidth="1" />
                        <ellipse cx="400" cy="200" rx="120" ry="55" fill="none" stroke="#C9A227" strokeWidth="0.8" />
                    </svg>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-gold/20 text-gold text-xs font-bold px-4 py-2 rounded-full mb-8 border border-gold/30">
                        ⚡ عرض محدود
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        أول <span className="text-gold">100 طالب</span> مجاناً
                    </h2>
                    <p className="text-earth/80 text-lg mb-12 max-w-xl mx-auto">
                        ابدأ رحلتك التعليمية الآن واحصل على اشتراكك مجاناً ضمن أول 100 طالب.
                    </p>

                    {/* Progress meter */}
                    <div className="bg-white/8 border border-white/15 rounded-3xl p-8 mb-10 max-w-md mx-auto">
                        <div className="flex items-end justify-center gap-2 mb-4">
                            <span className="text-5xl font-black text-gold">73</span>
                            <span className="text-white/50 text-xl mb-2">/ 100</span>
                        </div>
                        <div className="text-earth/70 text-sm mb-5">طالب حصلوا على الاشتراك المجاني</div>

                        {/* Progress bar */}
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                                style={{ width: '73%', background: 'linear-gradient(90deg, #C9A227, #D9B84A)' }} />
                        </div>

                        <div className="flex justify-between text-xs mt-2">
                            <span className="text-earth/50">0</span>
                            <div className="text-gold font-bold">27 مقعد متبقي</div>
                            <span className="text-earth/50">100</span>
                        </div>
                    </div>

                    <Link href="/register" className="btn-gold btn-lg shadow-gold mx-auto">
                        احجز مقعدك المجاني الآن
                    </Link>
                </div>
            </section>

            {/* 6. HOW IT WORKS ─────────────────────────────────────────── */}
            <section id="how" className="py-24 bg-offwhite relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none geo-grid-bg opacity-40" aria-hidden="true" />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="section-label justify-center">
                            <span className="w-8 h-px bg-gold" />
                            كيف تبدأ
                            <span className="w-8 h-px bg-gold" />
                        </div>
                        <h2 className="section-title text-center">أربع خطوات للبداية</h2>
                        <p className="section-subtitle mx-auto text-center">سجّل وابدأ رحلتك في أقل من دقيقتين.</p>
                    </div>

                    <div className="relative">
                        {/* Connector line — desktop */}
                        <div className="absolute top-10 right-12 left-12 h-0.5 hidden lg:block"
                            style={{ background: 'linear-gradient(90deg, #C9A227, #356B7A, #C9A227)' }} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {steps.map((step, i) => (
                                <div key={step.num} className="relative text-center">
                                    {/* Number circle */}
                                    <div className="relative z-10 w-20 h-20 rounded-2xl mx-auto mb-5 flex flex-col items-center justify-center shadow-forest border-2 border-white"
                                        style={{ background: i % 2 === 0 ? '#123C32' : '#356B7A' }}>
                                        <span className="text-gold/70 text-[10px] font-black tracking-widest">STEP</span>
                                        <span className="text-white font-black text-2xl leading-none">{step.num}</span>
                                    </div>
                                    <h3 className="font-black text-darktext text-lg mb-2">{step.title}</h3>
                                    <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. REFERRAL ─────────────────────────────────────────────── */}
            <section id="referral" className="py-24 bg-white relative overflow-hidden">
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white border border-earth/60 rounded-3xl p-10 md:p-16 text-right"
                        style={{ boxShadow: '0 20px 80px -16px rgba(18,60,50,0.12)' }}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <div className="section-label">
                                    <span className="w-8 h-px bg-gold" />
                                    برنامج الإحالة
                                </div>
                                <h2 className="section-title">شارك المعرفة... واكسب نقاطاً</h2>
                                <p className="text-muted leading-relaxed mb-8">
                                    شارك المنصة مع أصدقائك واحصل على نقاط عند تسجيلهم وقبول حساباتهم.
                                    كل صديق تدعوه يضيف <strong className="text-forest">100 XP</strong> لرصيدك.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        id="copy-referral-btn"
                                        className="btn-outline text-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText('https://tawfeek.com/ref/ahmed123');
                                        }}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        نسخ رابط الإحالة
                                    </button>
                                    <a
                                        href="https://wa.me/?text=انضم%20لمنصة%20التوفيق%20التعليمية%20عبر%20رابطي"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary text-sm"
                                        id="whatsapp-share-btn"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        شارك عبر واتساب
                                    </a>
                                </div>
                            </div>

                            {/* Referral link display */}
                            <div className="bg-offwhite rounded-2xl p-6 border border-earth/50">
                                <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">رابط إحالتك الخاص</div>
                                <div className="flex items-center gap-3 bg-white rounded-xl border border-earth px-4 py-3">
                                    <span className="flex-1 text-sm font-mono text-darktext/70 truncate text-left" dir="ltr">
                                        tawfeek.com/ref/ahmed123
                                    </span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
                                </div>
                                <div className="mt-4 p-4 bg-gold/8 rounded-xl border border-gold/20">
                                    <div className="text-xs text-gold-dark font-semibold mb-1">نقاطك من الإحالة</div>
                                    <div className="text-3xl font-black text-gold">+100 XP</div>
                                    <div className="text-xs text-muted mt-0.5">لكل صديق يُقبل حسابه</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 8. TESTIMONIALS ─────────────────────────────────────────── */}
            <section id="testimonials" className="py-24 bg-offwhite relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none geo-grid-bg opacity-40" aria-hidden="true" />
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <div className="section-label justify-center">
                            <span className="w-8 h-px bg-gold" />
                            آراء الطلاب
                            <span className="w-8 h-px bg-gold" />
                        </div>
                        <h2 className="section-title text-center">ماذا يقول طلابنا؟</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-7 border border-earth/50 text-right"
                                style={{ boxShadow: '0 2px 16px -4px rgba(18,60,50,0.08)' }}>
                                {/* Stars */}
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <svg key={s} className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-darktext/80 text-sm leading-relaxed mb-5">"{t.text}"</p>
                                <div className="flex items-center gap-3 pt-4 border-t border-earth/40">
                                    <div className="w-9 h-9 rounded-full bg-forest/15 flex items-center justify-center text-forest font-black text-sm">
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-darktext text-sm">{t.name}</div>
                                        <div className="text-xs text-muted">{t.grade}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 9. FAQ ──────────────────────────────────────────────────── */}
            <section id="faq" className="py-24 bg-white relative overflow-hidden">
                <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <div className="section-label justify-center">
                            <span className="w-8 h-px bg-gold" />
                            الأسئلة الشائعة
                            <span className="w-8 h-px bg-gold" />
                        </div>
                        <h2 className="section-title text-center">هل لديك سؤال؟</h2>
                    </div>

                    <div className="bg-white border border-earth/50 rounded-3xl px-8 py-4"
                        style={{ boxShadow: '0 4px 30px -6px rgba(18,60,50,0.10)' }}>
                        {faqs.map((faq, i) => (
                            <FaqItem key={i} q={faq.q} a={faq.a} isLast={i === faqs.length - 1} />
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
