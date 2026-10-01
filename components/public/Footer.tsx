'use client';

import Link from 'next/link';

const quickLinks = [
    { label: 'الرئيسية', href: '/' },
    { label: 'المواد الدراسية', href: '#subjects' },
    { label: 'الدروس', href: '#courses' },
    { label: 'الاختبارات', href: '#exams' },
    { label: 'من نحن', href: '#about' },
    { label: 'تواصل معنا', href: '#contact' },
];

const subjects = [
    { label: 'الجغرافيا', href: '#subjects' },
    { label: 'التاريخ', href: '#subjects' },
    { label: 'الدراسات الاجتماعية', href: '#subjects' },
];

const legal = [
    { label: 'سياسة الخصوصية', href: '#' },
    { label: 'شروط الاستخدام', href: '#' },
];

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer
            id="footer"
            className="relative overflow-hidden"
            style={{ background: '#0c2820' }}
        >
            {/* Contour decoration */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1440 500" preserveAspectRatio="xMidYMid slice">
                    <ellipse cx="1200" cy="-50" rx="400" ry="300" fill="none" stroke="#D8C3A5" strokeWidth="1.5" />
                    <ellipse cx="200" cy="550" rx="350" ry="250" fill="none" stroke="#C9A227" strokeWidth="1" />
                </svg>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Main footer grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 py-16">

                    {/* Brand column */}
                    <div className="lg:col-span-2">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-16 h-16 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img src="/لوجو.jpg" alt="لوجو التوفيق" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="font-black text-xl text-white">منصة التوفيق</div>
                                <div className="text-[10px] text-gold/70 font-semibold tracking-widest">TAWFEEK PLATFORM</div>
                            </div>
                        </div>

                        <p className="text-earth/60 text-sm leading-relaxed max-w-xs mb-7">
                            منصة مستر أبو زيد التعليمية — متخصصة في الجغرافيا والتاريخ والدراسات الاجتماعية.
                            التوفيق معك لآخر الطريق ✨
                        </p>

                        {/* Social icons */}
                        <div className="flex gap-3">
                            {[
                                {
                                    id: 'social-whatsapp',
                                    label: 'واتساب',
                                    href: 'https://wa.me/201000000000',
                                    icon: (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    ),
                                },
                                {
                                    id: 'social-facebook',
                                    label: 'فيسبوك',
                                    href: '#',
                                    icon: (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                    ),
                                },
                                {
                                    id: 'social-youtube',
                                    label: 'يوتيوب',
                                    href: '#',
                                    icon: (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                        </svg>
                                    ),
                                },
                            ].map(s => (
                                <a
                                    key={s.id}
                                    id={s.id}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={s.label}
                                    className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-earth/50 hover:text-gold hover:border-gold/30 hover:bg-gold/10 transition-all duration-200"
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick links */}
                    <div>
                        <div className="text-xs font-bold text-gold/70 uppercase tracking-widest mb-5">روابط سريعة</div>
                        <ul className="space-y-3">
                            {quickLinks.map(link => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-earth/55 text-sm hover:text-gold transition-colors flex items-center gap-2"
                                    >
                                        <span className="w-1 h-1 rounded-full bg-gold/40 flex-shrink-0" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Subjects + Contact */}
                    <div>
                        <div className="text-xs font-bold text-gold/70 uppercase tracking-widest mb-5">المواد الدراسية</div>
                        <ul className="space-y-3 mb-8">
                            {subjects.map(s => (
                                <li key={s.label}>
                                    <Link
                                        href={s.href}
                                        className="text-earth/55 text-sm hover:text-gold transition-colors flex items-center gap-2"
                                    >
                                        <span className="w-1 h-1 rounded-full bg-gold/40 flex-shrink-0" />
                                        {s.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="text-xs font-bold text-gold/70 uppercase tracking-widest mb-4">تواصل معنا</div>
                        <div className="space-y-2">
                            <a href="mailto:info@tawfeek.com"
                                className="text-earth/55 text-sm hover:text-gold transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                info@tawfeek.com
                            </a>
                            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer"
                                className="text-earth/55 text-sm hover:text-gold transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                تواصل عبر واتساب
                            </a>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,195,165,0.15), transparent)' }} />

                {/* Bottom bar */}
                <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-earth/40">
                    <span>© {year} منصة التوفيق. جميع الحقوق محفوظة.</span>
                    <div className="flex items-center gap-4">
                        {legal.map(l => (
                            <Link key={l.label} href={l.href} className="hover:text-gold transition-colors">
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
