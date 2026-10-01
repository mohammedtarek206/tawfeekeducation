'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const navLinks = [
    { label: 'الرئيسية', href: '/' },
    { label: 'المواد الدراسية', href: '#subjects' },
    { label: 'الدروس', href: '#courses' },
    { label: 'الاختبارات', href: '#exams' },
    { label: 'من نحن', href: '#about' },
    { label: 'تواصل معنا', href: '#contact' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeLink, setActiveLink] = useState('/');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <nav
                id="main-navbar"
                className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled
                    ? 'bg-white/95 backdrop-blur-lg border-b border-earth/50 shadow-[0_4px_20px_-4px_rgba(18,60,50,0.12)]'
                    : 'bg-transparent'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">

                        {/* Logo — RTL: right side */}
                        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
                            {/* Compass icon logo */}
                            <div className="w-14 h-14 rounded-xl bg-forest flex items-center justify-center shadow-forest/20 shadow-lg group-hover:scale-105 transition-transform duration-300 overflow-hidden flex-shrink-0">
                                <img src="/لوجو.jpg" alt="لوجو التوفيق" className="w-full h-full object-cover" />
                            </div>
                            <div className="leading-none">
                                <div className={`font-extrabold text-xl tracking-tight transition-colors duration-300 ${scrolled ? 'text-darktext' : 'text-darktext'}`}>
                                    منصة التوفيق
                                </div>
                                <div className={`text-[10px] font-medium tracking-widest transition-colors duration-300 ${scrolled ? 'text-gold' : 'text-gold'}`}>
                                    TAWFEEK PLATFORM
                                </div>
                            </div>
                        </Link>

                        {/* Desktop Nav Links — center */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setActiveLink(link.href)}
                                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 group
                                        ${activeLink === link.href
                                            ? 'text-forest'
                                            : `${scrolled ? 'text-darktext/70 hover:text-forest' : 'text-darktext/80 hover:text-forest'}`
                                        }`}
                                >
                                    {link.label}
                                    <span className={`absolute bottom-1 right-4 left-4 h-0.5 bg-gold rounded-full transition-all duration-300 origin-right
                                        ${activeLink === link.href ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60'}`}
                                    />
                                </Link>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="hidden lg:flex items-center gap-3">
                            <Link
                                href="/login"
                                className="text-sm font-semibold text-forest hover:text-forest-dark px-4 py-2 rounded-lg hover:bg-forest/[0.06] transition-all duration-200"
                            >
                                تسجيل الدخول
                            </Link>
                            <Link
                                href="/register"
                                className="btn-gold btn-sm text-sm px-5 py-2.5"
                            >
                                ابدأ الآن
                                <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            id="mobile-menu-btn"
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-forest/[0.08] transition-all"
                            aria-label="القائمة"
                        >
                            <span className={`block w-5.5 h-0.5 bg-forest rounded-full transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} style={{ width: '22px' }} />
                            <span className={`block h-0.5 bg-forest rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'}`} style={{ width: '16px' }} />
                            <span className={`block w-5.5 h-0.5 bg-forest rounded-full transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} style={{ width: '22px' }} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            <div
                className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${menuOpen ? 'visible' : 'invisible'}`}
                onClick={() => setMenuOpen(false)}
            >
                <div className={`absolute inset-0 bg-darktext/40 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            <div
                className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl lg:hidden transition-transform duration-400 ease-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-earth/50">
                        <div>
                            <div className="font-extrabold text-lg text-darktext">منصة التوفيق</div>
                            <div className="text-[10px] text-gold font-semibold tracking-widest">TAWFEEK PLATFORM</div>
                        </div>
                        <button
                            onClick={() => setMenuOpen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-earth/40 text-darktext/60 hover:text-darktext"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Drawer Links */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-darktext/80 font-semibold hover:bg-forest/[0.08] hover:text-forest transition-all"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Drawer CTAs */}
                    <div className="px-4 py-5 space-y-3 border-t border-earth/50">
                        <Link href="/login" onClick={() => setMenuOpen(false)}
                            className="block w-full text-center btn-outline py-3 text-sm">
                            تسجيل الدخول
                        </Link>
                        <Link href="/register" onClick={() => setMenuOpen(false)}
                            className="block w-full text-center btn-gold py-3 text-sm">
                            ابدأ الآن
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
