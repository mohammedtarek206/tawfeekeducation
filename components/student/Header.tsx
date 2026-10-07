'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { gradeLabel } from '@/lib/utils/helpers';

interface UserData {
    name: string;
    phone?: string;
    points: number;
    level: number;
    streak: number;
    grade: string;
    status?: string;
    subscriptionStatus?: string;
    isFreeStudent: boolean;
}

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        fetch('/api/auth/me')
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setUser(data.data.user);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const statusLabel = user?.status === 'approved' ? 'معتمد' : user?.status === 'pending' ? 'قيد المراجعة' : 'غير نشط';
    const subLabel = user?.isFreeStudent || user?.subscriptionStatus === 'active' ? 'نشط' : user?.subscriptionStatus === 'expired' ? 'منتهي' : 'غير نشط';

    return (
        <header className="bg-white border-b border-earth/30 sticky top-0 z-30 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
                {user?.isFreeStudent && (
                    <span className="hidden sm:inline-flex items-center gap-1 bg-gold text-white shadow-sm text-xs font-bold px-2.5 py-1 rounded-lg">
                        ⭐ طالب مجاني
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
                {/* Streak */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-earth/20 text-earth-dark rounded-lg font-bold border border-earth/30" title="أيام المداومة">
                    <span>🔥</span>
                    <span suppressHydrationWarning>{mounted ? (user?.streak || 0) : 0}</span>
                </div>

                {/* Level */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-forest/10 text-forest rounded-lg font-bold border border-earth/40" title="المستوى">
                    <span>⭐</span>
                    <span suppressHydrationWarning>{mounted ? (user?.level || 1) : 1}</span>
                </div>

                {/* Points */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/10 text-gold-dark rounded-lg font-bold border border-gold/30" title="إجمالي النقاط">
                    <span>🧭</span>
                    <span suppressHydrationWarning>{mounted ? (user?.points || 0) : 0}</span>
                </div>

                {/* User Menu Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2.5 hover:opacity-90 transition-all focus:outline-none bg-offwhite hover:bg-earth/20 p-1.5 rounded-2xl border border-earth/30"
                    >
                        <div className="w-10 h-10 bg-forest text-white rounded-full flex items-center justify-center font-black text-lg overflow-hidden border-2 border-gold shadow-sm shrink-0">
                            {user?.name ? user.name.charAt(0) : 'ط'}
                        </div>
                        <div className="hidden md:block text-right pr-1">
                            <div className="text-sm font-black text-darktext truncate max-w-[130px]" suppressHydrationWarning>
                                {mounted ? (user?.name || 'طالب') : 'طالب'}
                            </div>
                            <div className="text-[11px] text-muted font-bold" suppressHydrationWarning>
                                {mounted && user?.grade ? gradeLabel(user.grade) : ''}
                            </div>
                        </div>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Card */}
                    {isOpen && (
                        <div className="absolute left-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl py-3 border border-earth/40 z-50 animate-fadeIn">
                            {/* Header Info */}
                            <div className="px-5 py-3 border-b border-earth/20 bg-offwhite/50 rounded-t-3xl">
                                <div className="font-black text-darktext text-base truncate">{user?.name || 'الطالب'}</div>
                                {user?.phone && (
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">رقم الهاتف: {user.phone}</div>
                                )}
                                <div className="text-xs text-forest font-bold mt-1">
                                    المرحلة: {gradeLabel(user?.grade || '')}
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 text-xs">
                                    <span className="text-gray-500">الحساب: <strong className="text-emerald-700">{statusLabel}</strong></span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">الاشتراك: <strong className={subLabel === 'نشط' ? 'text-emerald-700' : 'text-amber-700'}>{subLabel}</strong></span>
                                </div>
                            </div>

                            {/* Menu Links */}
                            <div className="py-2 space-y-1 text-sm font-bold">
                                <Link
                                    href="/student/profile"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-forest/10 hover:text-forest transition-colors"
                                >
                                    <span>👤</span> الملف الشخصي
                                </Link>
                                <Link
                                    href="/subscriptions"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-forest/10 hover:text-forest transition-colors"
                                >
                                    <span>💳</span> اشتراكاتي
                                </Link>
                                <Link
                                    href="/student/dashboard#results"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-forest/10 hover:text-forest transition-colors"
                                >
                                    <span>📊</span> نتائجي
                                </Link>
                                <Link
                                    href="/student/achievements"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-forest/10 hover:text-forest transition-colors"
                                >
                                    <span>🏆</span> إنجازاتي
                                </Link>
                                <Link
                                    href="/student/tasks"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-forest/10 hover:text-forest transition-colors"
                                >
                                    <span>📝</span> مهامي
                                </Link>

                                <div className="border-t border-earth/20 pt-2 mt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-right px-5 py-2.5 text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-bold transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        تسجيل الخروج
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
