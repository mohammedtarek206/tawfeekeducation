'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';
import { useEffect, useState } from 'react';

const LINKS = [
    { href: '/admin/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/admin/subscriptions/plans', label: 'الباقات والاشتراكات', icon: '📦' },
    { href: '/admin/subscriptions/requests', label: 'طلبات الاشتراك', icon: '💳' },
    { href: '/admin/subscriptions/payment-methods', label: 'طرق الدفع', icon: '💵' },
    { href: '/admin/students', label: 'الطلاب والموافقات', icon: '👥' },
    { href: '/admin/parents', label: 'أولياء الأمور', icon: '👨‍👩‍👧‍👦' },
    { href: '/admin/free-students', label: 'الطلاب المجانيين', icon: '🎁' },
    { href: '/admin/lessons', label: 'إدارة الحصص', icon: '🎬' },
    { href: '/admin/questions', label: 'بنك الأسئلة', icon: '💾' },
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

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl"
            >
                <span className="text-2xl">{isOpen ? '✕' : '☰'}</span>
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
                    <Link href="/admin/dashboard" className="flex items-center gap-3 mb-10">
                        <div className="w-14 h-14 bg-tawfeek-green rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src="/لوجو.jpg" alt="لوجو التوفيق" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-black text-xl text-white">إدارة منصة</div>
                            <div className="text-tawfeek-green text-xs font-semibold">التوفيق</div>
                        </div>
                    </Link>

                    <nav className="space-y-1">
                        {LINKS.map((link) => {
                            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium',
                                        active
                                            ? 'bg-tawfeek-green text-white'
                                            : 'hover:bg-gray-800 hover:text-white'
                                    )}
                                >
                                    <span className="text-lg">{link.icon}</span>
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
