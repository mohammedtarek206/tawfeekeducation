'use client';

import Sidebar from '@/components/student/Sidebar';
import Header from '@/components/student/Header';
import DevCredit from '@/components/shared/DevCredit';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col lg:mr-64 transition-all duration-300">
                <Header />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
                    {children}
                </main>
                <DevCredit />
            </div>
        </div>
    );
}

