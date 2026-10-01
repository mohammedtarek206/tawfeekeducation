import { Metadata } from 'next';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'فروعنا | أبو زيد للدراسات والجغرافيا والتاريخ',
    description: 'تعرف على فروع وسناتر أستاذ أبو زيد للدراسات الاجتماعية والجغرافيا والتاريخ.',
    openGraph: {
        title: 'فروعنا | أبو زيد',
        description: 'فروع وسناتر أستاذ أبو زيد.',
        locale: 'ar_EG',
        type: 'website',
    },
};

export default function BranchesPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-tawfeek-bg pt-28 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-black text-tawfeek-primary mb-6">فروعنا للسناتر</h1>

                    {/* Re-use the existing BranchesSection component here if it's modular, but since it's already used on the homepage, let's create a visual for it. */}
                    <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-tawfeek-border">
                        <div className="text-6xl mb-6">📍</div>
                        <h2 className="text-2xl font-bold text-tawfeek-text mb-4">يتم تجهيز بيانات الفروع</h2>
                        <p className="text-tawfeek-text-light mb-8">
                            سنقوم بإضافة عناوين وتفاصيل الفروع قريباً. يمكنك الحجز والاستفادة من محتوى المنصة أونلاين الآن.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center bg-tawfeek-accent text-white px-8 py-4 rounded-2xl font-bold hover:bg-tawfeek-primary-light transition-all duration-200 active:scale-95 shadow-sm"
                        >
                            العودة للرئيسية
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
