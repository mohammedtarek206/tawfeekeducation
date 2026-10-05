import { Metadata } from 'next';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'من نحن | منصة التوفيق التعليمية',
    description: 'تعرف على منصتنا التعليمية المتخصصة في شرح الدراسات الاجتماعية والتاريخ لصفوف الإعدادية والثانوية.',
    openGraph: {
        title: 'عن منصة التوفيق | للدراسات والتاريخ',
        description: 'منصة التوفيق متخصصة في شرح الدراسات الاجتماعية والتاريخ وتوفير اختبارات تفاعلية.',
        locale: 'ar_EG',
        type: 'website',
    },
};

export default function AboutPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-tawfeek-bg pt-28 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-tawfeek-border">
                        <h1 className="text-4xl font-black text-tawfeek-primary mb-6 text-center">عن منصة التوفيق</h1>
                        <div className="prose prose-lg text-tawfeek-text mx-auto font-medium leading-relaxed">
                            <p className="mb-6">
                                <strong>منصة التوفيق</strong> هي منصة تعليمية متكاملة تهدف إلى تيسير وصول المعلومة للطالب وتسهيل عملية المذاكرة والمراجعة والتقييم لطلاب المرحلة الإعدادية والثانوية في مواد الدراسات الاجتماعية والتاريخ.
                            </p>
                            <p className="mb-6">
                                نسعى دائماً إلى توفير أفضل تجربة تعليمية من خلال تقديم محتوى علمي دقيق، وبناء نظام تفاعلي يحاكي أحدث طرق التدريس، بالإضافة إلى توفير بيئة تنافسية تحفز الطلاب على الاجتهاد والتميز للحصول على المكافآت.
                            </p>
                            <h2 className="text-2xl font-bold text-tawfeek-primary mt-8 mb-4">لماذا منصة التوفيق؟</h2>
                            <ul className="list-disc list-inside space-y-2 mb-8">
                                <li>شرح وافٍ وتفصيلي للمنهج الدراسي مع الخبير أستاذ أبو زيد.</li>
                                <li>كويزات بعد كل حصة للتأكد من فهمك واستيعابك.</li>
                                <li>امتحانات أسبوعية وشهرية لتقييم مستواك.</li>
                                <li>متابعة مستمرة لولي الأمر للوقوف على مستوى الطالب ومتابعة تطوره.</li>
                                <li>نظام جوائز ومكافآت لتحفيزك على التميز والتفوق وحصد النقاط.</li>
                            </ul>

                            <div className="mt-12 text-center">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center justify-center bg-tawfeek-accent text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-tawfeek-primary-light transition-all duration-200 active:scale-95 shadow-sm"
                                >
                                    🚀 انضم إلينا الآن
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
