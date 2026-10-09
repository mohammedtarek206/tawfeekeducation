'use client';
import Sidebar from '@/components/parent/Sidebar';
import Header from '@/components/parent/Header';
import { ParentProvider } from '@/components/parent/ParentContext';
import ParentAppBanner from '@/components/parent/ParentAppBanner';
import DevCredit from '@/components/shared/DevCredit';

export default function ParentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ParentProvider>
            <div className="min-h-screen bg-offwhite flex font-sans">
                <Sidebar />
                <div className="flex-1 flex flex-col lg:mr-64 transition-all duration-300">
                    <Header />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
                        {children}
                    </main>
                    <DevCredit />
                </div>
            </div>
            {/* بانر تثبيت تطبيق ولي الأمر */}
            <ParentAppBanner />
        </ParentProvider>
    );
}

