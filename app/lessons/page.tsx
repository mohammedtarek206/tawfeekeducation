import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import LatestLessons from '@/components/public/LatestLessons';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'دروس الدراسات والجغرافيا والتاريخ | أبو زيد',
    description:
        'استعرض جميع دروس شرح الدراسات الاجتماعية والجغرافيا والتاريخ مع أستاذ أبو زيد للمرحلة الإعدادية والثانوية.',
    keywords: [
        'دروس الدراسات الاجتماعية',
        'شرح الجغرافيا',
        'شرح التاريخ',
        'أبو زيد دروس',
        'مراجعة الجغرافيا',
        'مراجعة التاريخ',
    ],
    alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/lessons`,
    },
    openGraph: {
        title: 'دروس الدراسات والجغرافيا والتاريخ | أبو زيد',
        description: 'جميع دروس الشرح مع أستاذ أبو زيد للمرحلة الإعدادية والثانوية.',
        locale: 'ar_EG',
        type: 'website',
    },
};

export default function LessonsPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-tawfeek-bg pt-28 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
                    <h1 className="text-4xl font-black text-tawfeek-primary mb-4">حصص المنصة</h1>
                    <p className="text-tawfeek-text-light text-lg">
                        تصفح أحدث الحصص المضافة لمنصة التوفيق، انضم لآلاف الطلاب وابدأ المذاكرة الآن.
                    </p>
                </div>

                {/* Re-use the LatestLessons component for now or duplicate its logic specifically for a full page */}
                <LatestLessons />

                <div className="max-w-3xl mx-auto px-4 mt-8 pb-12 text-center">
                    <div className="bg-white rounded-3xl p-8 border border-tawfeek-border shadow-sm">
                        <h2 className="text-2xl font-bold text-tawfeek-text mb-4">اشترك الآن لفتح كل الحصص</h2>
                        <p className="text-tawfeek-text-light mb-6">احصل على وصول كامل لجميع دروس الشرح والحل والامتحانات الأسبوعية والشهرية.</p>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center bg-tawfeek-accent text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-tawfeek-primary-light transition-all duration-200 active:scale-95 shadow-sm"
                        >
                            🚀 سجل الآن وابدأ المذاكرة
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
