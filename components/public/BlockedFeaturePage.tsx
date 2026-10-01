import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import Link from 'next/link';
import { ReactNode } from 'react';

interface BlockedFeaturePageProps {
    emoji: string;
    title: string;
    desc: ReactNode;
}

export default function BlockedFeaturePage({ emoji, title, desc }: BlockedFeaturePageProps) {
    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-tawfeek-bg flex items-center justify-center py-28">
                <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-white rounded-3xl p-10 sm:p-14 shadow-sm border border-tawfeek-border">
                        <div className="text-7xl mb-6 animate-pulse-soft">{emoji}</div>
                        <h1 className="text-3xl sm:text-4xl font-black text-tawfeek-primary mb-4">{title}</h1>
                        <div className="text-tawfeek-text-light text-lg mb-10 font-medium">
                            {desc}
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center bg-tawfeek-accent text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-tawfeek-primary-light transition-all duration-200 active:scale-95 shadow-sm"
                            >
                                🚀 حساب جديد
                            </Link>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto inline-flex items-center justify-center bg-white text-tawfeek-primary border border-tawfeek-border 
                                 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-tawfeek-bg transition-all duration-200 shadow-sm"
                            >
                                تسجيل الدخول
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
