'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const MENU_ITEMS = [
    { label: 'نظرة عامة', icon: '📊', href: '/parent/dashboard' },
    { label: 'النتائج والمستوى', icon: '📝', href: '/parent/results' },
    { label: 'النشاط والمتابعة', icon: '⏱️', href: '/parent/activity' },
    { label: 'ربط طالب جديد', icon: '🔗', href: '/parent/link' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 bg-forest text-white p-4 rounded-full shadow-lg"
            >
                {isOpen ? '✕' : '☰'}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed top-0 right-0 h-screen bg-white border-l border-earth/30 w-64
                transform transition-transform duration-300 z-40 flex flex-col shadow-[rgba(18,60,50,0.05)_0px_8px_24px]
                ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6">
                    <Link href="/parent/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-xl shadow-inner">
                            👨‍👩‍👦
                        </div>
                        <h2 className="font-black text-xl text-forest">بوابة أولياء الأمور</h2>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {MENU_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200
                                    ${isActive
                                        ? 'bg-forest text-white shadow-md'
                                        : 'text-gray-600 hover:bg-earth/20 hover:text-forest'
                                    }
                                `}
                            >
                                <span className={`text-xl ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-darktext/20 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
