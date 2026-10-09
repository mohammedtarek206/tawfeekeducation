'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import DevCredit from '@/components/shared/DevCredit';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    if (isLoginPage) {
        return <div className="min-h-screen bg-offwhite">{children}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col lg:mr-64 transition-all duration-300 min-w-0">
                <Header />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    {children}
                </main>
                <DevCredit />
            </div>
        </div>
    );
}

