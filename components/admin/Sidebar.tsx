'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';
import { useEffect, useState } from 'react';

const LINKS = [
    { href: '/admin/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/admin/tasks', label: 'إدارة المهام', icon: '🎯' },
    { href: '/admin/achievements', label: 'إدارة الإنجازات', icon: '🏆' },
    { href: '/admin/student-mistakes', label: 'أخطاء الطلاب', icon: '🔍' },
    { href: '/admin/subscriptions/plans', label: 'الباقات والاشتراكات', icon: '📦' },
    { href: '/admin/subscriptions/requests', label: 'طلبات الاشتراك', icon: '💳' },
    { href: '/admin/subscriptions/payment-methods', label: 'طرق الدفع', icon: '💵' },
    { href: '/admin/students', label: 'الطلاب والموافقات', icon: '👥' },
    { href: '/admin/parents', label: 'أولياء الأمور', icon: '👨‍👩‍👧‍👦' },
    { href: '/admin/free-students', label: 'الطلاب المجانيين', icon: '🎁' },
    { href: '/admin/lessons', label: 'إدارة الحصص', icon: '🎬' },
    { href: '/admin/questions', label: 'بنك الأسئلة', icon: '💾' },
    { href: '/admin/questions/import', label: 'استيراد أسئلة', icon: '📥' },
    { href: '/admin/exams', label: 'الامتحانات', icon: '📝' },
    { href: '/admin/rewards', label: 'الجوائز والاستبدال', icon: '🎁' },
    { href: '/admin/gamification', label: 'النقاط والسجلات', icon: '🪙' },
    { href: '/admin/lesson-quizzes', label: 'اختبارات الحصص', icon: '📝' },
    { href: '/admin/solution-videos', label: 'فيديوهات الحل', icon: '▶️' },
    { href: '/admin/weekly-exams', label: 'الاختبارات الأسبوعية', icon: '📅' },
    { href: '/admin/monthly-exams', label: 'الاختبارات الشهرية', icon: '📆' },
    { href: '/admin/study-notes', label: 'مذكرات سؤال وجواب', icon: '📚' },
    { href: '/admin/ask-master', label: 'اسأل المستر', icon: '🤖' },
    { href: '/admin/settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl"
                aria-label="القائمة الجانبية"
            >
                <span className="text-2xl" suppressHydrationWarning>{isOpen ? '✕' : '☰'}</span>
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'fixed top-0 bottom-0 right-0 z-40 w-64 bg-gray-900 text-gray-300 transition-transform duration-300 transform lg:translate-x-0 overflow-y-auto',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                <div className="p-6 pb-32">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-tawfeek-green rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src="/لوجو.jpg" alt="لوجو التوفيق" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-black text-lg text-white">إدارة منصة</div>
                            <div className="text-tawfeek-green text-xs font-bold">التوفيق التعليمية</div>
                        </div>
                    </Link>

                    <nav className="space-y-1">
                        {LINKS.map((link) => {
                            const active = mounted && (pathname === link.href || (link.href !== '/admin/dashboard' && pathname.startsWith(`${link.href}/`)));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold',
                                        active
                                            ? 'bg-tawfeek-green text-white shadow-sm'
                                            : 'hover:bg-gray-800 hover:text-white text-gray-300'
                                    )}
                                >
                                    <span className="text-base" suppressHydrationWarning>{link.icon}</span>
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
