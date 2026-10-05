'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';
import { useEffect, useState } from 'react';

const LINKS = [
    { href: '/student/dashboard', label: 'الرئيسية', icon: '🏠' },
    { href: '/student/tasks', label: 'مهامي', icon: '🎯' },
    { href: '/student/achievements', label: 'الأوسمة والإنجازات', icon: '🏆' },
    { href: '/student/subscriptions', label: 'الاشتراكات', icon: '⭐' },
    { href: '/student/lessons', label: 'الحصص', icon: '🎬' },
    { href: '/student/lesson-quizzes', label: 'اختبارات الحصص', icon: '📝' },
    { href: '/student/solution-videos', label: 'فيديوهات الحل', icon: '▶️' },
    { href: '/student/exams', label: 'الامتحانات', icon: '📊' },
    { href: '/student/weekly-exams', label: 'الاختبار الأسبوعي', icon: '📅' },
    { href: '/student/monthly-exams', label: 'الاختبار الشهري', icon: '📆' },
    { href: '/student/mistakes', label: 'أخطائي', icon: '📋' },
    { href: '/student/study-notes', label: 'مذكرات س/ج', icon: '📚' },
    { href: '/student/ask-master', label: 'اسأل المستر', icon: '🤖' },
    { href: '/student/rewards', label: 'الجوائز', icon: '🎁' },
    { href: '/student/leaderboard', label: 'لوحة الشرف', icon: '🥇' },
];


export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close sidebar on route change for mobile
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Toggle & Overlay */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-forest text-white rounded-full flex items-center justify-center shadow-lg"
            >
                <span className="text-2xl" suppressHydrationWarning>{isOpen ? '✕' : '☰'}</span>
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <aside
                className={cn(
                    'fixed top-0 bottom-0 right-0 z-40 w-64 bg-white border-l border-gray-200 transition-transform duration-300 transform lg:translate-x-0 overflow-y-auto',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                <div className="p-6 pb-32">
                    <Link href="/" className="flex items-center gap-3 mb-10">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden border border-gold/30 flex-shrink-0">
                            <img src="/لوجو.jpg" alt="لوجو التوفيق" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-black text-xl text-forest">التوفيق</div>
                            <div className="text-muted text-xs font-semibold">بوابة الطالب</div>
                        </div>
                    </Link>

                    <nav className="space-y-2">
                        {LINKS.map((link) => {
                            const active = mounted && (pathname === link.href || (link.href !== '/student/dashboard' && pathname.startsWith(`${link.href}/`)));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm',
                                        active
                                            ? 'bg-forest text-white shadow-forest'
                                            : 'text-[#7A8C85] hover:bg-offwhite hover:text-forest'
                                    )}
                                >
                                    <span className="text-xl" suppressHydrationWarning>{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}

