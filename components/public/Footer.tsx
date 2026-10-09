'use client';

import { useState, useEffect } from 'react';
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
    { label: 'التاريخ', href: '#subjects' },
    { label: 'الدراسات الاجتماعية', href: '#subjects' },
];

const legal = [
    { label: 'سياسة الخصوصية', href: '#' },
    { label: 'شروط الاستخدام', href: '#' },
];

// ─── SVG Icon Components ────────────────────────────────────
const FacebookIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

const YouTubeIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

const WhatsAppIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

const PhoneIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);

const CodeIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
);

// ─── Main Footer Component ───────────────────────────────────
export default function Footer() {
    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    return (
        <footer
            id="footer"
            dir="rtl"
            className="relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0a2018 0%, #0c2820 60%, #0b1f17 100%)' }}
        >
            {/* Subtle background decoration */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">
                    <ellipse cx="1200" cy="-50" rx="400" ry="300" fill="none" stroke="#D8C3A5" strokeWidth="1.5" />
                    <ellipse cx="200" cy="650" rx="350" ry="250" fill="none" stroke="#C9A227" strokeWidth="1" />
                    <ellipse cx="700" cy="300" rx="500" ry="200" fill="none" stroke="#C9A227" strokeWidth="0.5" />
                </svg>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 py-14">

                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-14 h-14 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img src="/لوجو.jpg" alt="لوجو منصة التوفيق" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="font-black text-lg text-white leading-tight">منصة التوفيق</div>
                                <div className="text-[9px] text-gold/60 font-semibold tracking-widest mt-0.5">TAWFEEK PLATFORM</div>
                            </div>
                        </div>

                        <p className="text-white/40 text-sm leading-relaxed mb-6">
                            منصة الأستاذ أبو زيد التعليمية — متخصصة في التاريخ والدراسات الاجتماعية.
                            التوفيق معك لآخر الطريق.
                        </p>

                        {/* Quick Social Icons */}
                        <div className="flex gap-2.5">
                            <a
                                href="https://www.facebook.com/share/19VmSxrhLg/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="فيسبوك الأستاذ أبو زيد"
                                title="فيسبوك"
                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 transition-all duration-200"
                            >
                                <FacebookIcon />
                            </a>
                            <a
                                href="https://youtube.com/@mrabozedtawfiek1"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="يوتيوب الأستاذ أبو زيد"
                                title="يوتيوب"
                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#FF0000] hover:border-[#FF0000]/40 hover:bg-[#FF0000]/10 transition-all duration-200"
                            >
                                <YouTubeIcon />
                            </a>
                            <a
                                href="tel:01094448448"
                                aria-label="اتصل بالأستاذ أبو زيد"
                                title="اتصل بنا"
                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold/40 hover:bg-gold/10 transition-all duration-200"
                            >
                                <PhoneIcon />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links + Subjects Column */}
                    <div>
                        <div className="text-[11px] font-bold text-gold/60 uppercase tracking-widest mb-5">روابط سريعة</div>
                        <ul className="space-y-3">
                            {quickLinks.map(link => (
                                <li key={link.href + link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-white/45 text-sm hover:text-gold transition-colors flex items-center gap-2 group"
                                    >
                                        <span className="w-1 h-1 rounded-full bg-gold/40 flex-shrink-0 group-hover:bg-gold transition-colors" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-7">
                            <div className="text-[11px] font-bold text-gold/60 uppercase tracking-widest mb-4">المواد الدراسية</div>
                            <ul className="space-y-3">
                                {subjects.map(s => (
                                    <li key={s.label}>
                                        <Link
                                            href={s.href}
                                            className="text-white/45 text-sm hover:text-gold transition-colors flex items-center gap-2 group"
                                        >
                                            <span className="w-1 h-1 rounded-full bg-gold/40 flex-shrink-0 group-hover:bg-gold transition-colors" />
                                            {s.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* ── Teacher Contact Section ── */}
                    <div className="lg:col-span-2">
                        <div className="text-[11px] font-bold text-gold/60 uppercase tracking-widest mb-5">تواصل مع المدرس</div>

                        <div className="bg-white/[0.04] rounded-2xl border border-white/[0.07] p-5 space-y-4">

                            {/* Teacher identity */}
                            <div className="flex items-center gap-3 pb-4 border-b border-white/[0.07]">
                                <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">الأستاذ أبو زيد</div>
                                    <div className="text-gold/60 text-xs">معلم التاريخ والدراسات الاجتماعية</div>
                                </div>
                            </div>

                            {/* 3 contact cards */}
                            <div className="grid grid-cols-3 gap-3">

                                {/* Facebook card */}
                                <a
                                    href="https://www.facebook.com/share/19VmSxrhLg/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="صفحة المدرس على فيسبوك"
                                    className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-[#1877F2]/40 hover:bg-[#1877F2]/8 transition-all duration-200 text-center"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-[#1877F2]/20 flex items-center justify-center text-[#1877F2] group-hover:bg-[#1877F2]/30 transition-colors">
                                        <FacebookIcon />
                                    </div>
                                    <span className="text-white/60 text-xs font-semibold group-hover:text-white transition-colors">فيسبوك</span>
                                    <span className="text-white/25 text-[10px] leading-tight">صفحة المدرس</span>
                                </a>

                                {/* YouTube card */}
                                <a
                                    href="https://youtube.com/@mrabozedtawfiek1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="قناة المدرس على يوتيوب"
                                    className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-[#FF0000]/40 hover:bg-[#FF0000]/8 transition-all duration-200 text-center"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-[#FF0000]/20 flex items-center justify-center text-[#FF0000] group-hover:bg-[#FF0000]/30 transition-colors">
                                        <YouTubeIcon />
                                    </div>
                                    <span className="text-white/60 text-xs font-semibold group-hover:text-white transition-colors">يوتيوب</span>
                                    <span className="text-white/25 text-[10px] leading-tight">قناة التوفيق</span>
                                </a>

                                {/* Phone card */}
                                <a
                                    href="tel:01094448448"
                                    aria-label="الاتصال بالأستاذ أبو زيد"
                                    className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-gold/40 hover:bg-gold/8 transition-all duration-200 text-center"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center text-gold group-hover:bg-gold/30 transition-colors">
                                        <PhoneIcon />
                                    </div>
                                    <span className="text-white/60 text-xs font-semibold group-hover:text-white transition-colors">اتصل بنا</span>
                                    <span className="text-gold/70 text-[10px] font-bold tracking-wide group-hover:text-gold transition-colors" dir="ltr">01094448448</span>
                                </a>
                            </div>

                            {/* WhatsApp full-width button */}
                            <a
                                href="https://wa.me/201094448448"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="تواصل مع المدرس عبر واتساب"
                                className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-bold hover:bg-[#25D366]/20 hover:border-[#25D366]/40 transition-all duration-200"
                            >
                                <WhatsAppIcon />
                                تواصل عبر واتساب
                            </a>
                        </div>
                    </div>
                </div>

                {/* ── Gold Divider ── */}
                <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.2), transparent)' }} />

                {/* ── Developer Credit ── */}
                <div className="py-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs text-white/30">
                    <div className="flex items-center gap-1.5">
                        <CodeIcon />
                        <span>Designed &amp; Developed by</span>
                        <span className="font-black text-gold/70 hover:text-gold transition-colors cursor-default select-none">Mohammed Tarek</span>
                    </div>
                    <span className="hidden sm:inline text-white/15 mx-1">·</span>
                    <a
                        href="tel:01284621015"
                        aria-label="الاتصال بمطور الموقع"
                        className="text-white/30 hover:text-gold/70 transition-colors font-mono tracking-wide"
                        dir="ltr"
                    >
                        01284621015
                    </a>
                </div>

                {/* ── Bottom Divider ── */}
                <div className="h-px w-full mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />

                {/* ── Copyright Bar ── */}
                <div className="pb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
                    <span suppressHydrationWarning>© {year} منصة التوفيق. جميع الحقوق محفوظة.</span>
                    <nav aria-label="روابط قانونية" className="flex items-center gap-4">
                        {legal.map(l => (
                            <Link key={l.label} href={l.href} className="hover:text-gold/60 transition-colors">
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>

            </div>
        </footer>
    );
}
