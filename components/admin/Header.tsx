'use client';

import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/admin/login');
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
            <div className="w-full flex items-center justify-between">
                <div className="font-bold text-gray-700 hidden sm:block">
                    لوحة تحكم المشرف
                </div>

                <button
                    onClick={handleLogout}
                    className="btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50 focus:ring-red-500 mr-auto flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    تسجيل الخروج
                </button>
            </div>
        </header>
    );
}
