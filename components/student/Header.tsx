'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gradeLabel } from '@/lib/utils/helpers';

interface UserData {
    name: string;
    points: number;
    level: number;
    streak: number;
    grade: string;
    isFreeStudent: boolean;
}

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetch('/api/auth/me')
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setUser(data.data.user);
            })
            .catch(() => { });
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <header className="bg-white border-b border-earth/30 sticky top-0 z-30 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
            <div className="flex items-center gap-4">
                {user?.isFreeStudent && (
                    <span className="hidden sm:inline-flex items-center gap-1 bg-gold text-white shadow-sm text-xs font-bold px-2 py-1 rounded-md">
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

                {/* User Menu */}
                <div className="relative group">
                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 bg-offwhite rounded-full flex items-center justify-center font-bold text-forest overflow-hidden border border-earth/40">
                            {user?.name ? user.name.charAt(0) : 'U'}
                        </div>
                        <div className="hidden md:block text-right pr-2 border-r border-earth/30">
                            <div className="text-sm font-bold text-darktext truncate max-w-[120px]" suppressHydrationWarning>
                                {mounted ? (user?.name || 'طالب') : 'طالب'}
                            </div>
                            <div className="text-xs text-muted" suppressHydrationWarning>
                                {mounted && user?.grade ? gradeLabel(user.grade) : ''}
                            </div>
                        </div>
                    </button>

                    {/* Dropdown */}
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 border border-gray-100 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                        <button
                            onClick={handleLogout}
                            className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2 font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            تسجيل الخروج
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
