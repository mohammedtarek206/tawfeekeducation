import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import { gradeLabel } from '@/lib/constants/grades';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type Props = {
    params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        await connectDB();
        const lesson = await Lesson.findById(params.id).lean();

        if (!lesson || !lesson.isPublished || lesson.subject === 'geography') {
            return { title: 'حصة غير متوفرة | منصة التوفيق' };
        }

        const subjectName = lesson.subject || 'الدراسات الاجتماعية';
        const gradeName = gradeLabel(lesson.grade) || 'الطلاب';
        const title = `${lesson.title} | ${subjectName} | منصة التوفيق`;
        const description = `شرح درس ${lesson.title} في مادة ${subjectName} لطلاب ${gradeName} مع منصة التوفيق. ${lesson.description || 'فيديو شرح، أسئلة ومراجعات.'}`;

        const url = `${SITE_URL}/lessons/${params.id}`;
        const imageUrl = lesson.thumbnail || (lesson.youtubeId ? `https://img.youtube.com/vi/${lesson.youtubeId}/maxresdefault.jpg` : `${SITE_URL}/لوجو.jpg`);

        return {
            title,
            description,
            alternates: { canonical: url },
            openGraph: {
                title,
                description,
                url,
                type: 'article',
                images: [{ url: imageUrl }],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [imageUrl],
            },
        };
    } catch (error) {
        return { title: 'تفاصيل الحصة | منصة التوفيق' };
    }
}

export default async function PublicLessonPage({ params }: Props) {
    let lesson: any = null;
    try {
        await connectDB();
        lesson = await Lesson.findById(params.id).lean();
    } catch (e) {
        // ignore
    }

    if (!lesson || !lesson.isPublished || lesson.subject === 'geography') {
        notFound();
    }

    const subjectName = lesson.subject || 'مادة عامة';
    const gradeName = gradeLabel(lesson.grade);
    const imageUrl = lesson.thumbnail || (lesson.youtubeId ? `https://img.youtube.com/vi/${lesson.youtubeId}/maxresdefault.jpg` : '/لوجو.jpg');

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: lesson.title,
        description: lesson.description || `درس شامل في مادة ${subjectName}`,
        provider: {
            '@type': 'Organization',
            name: 'منصة التوفيق التعليمية',
            sameAs: SITE_URL
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-tawfeek-bg pt-28 pb-16">
                {/* Structured Data */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-tawfeek-border">
                        <div className="relative h-64 sm:h-96 bg-gray-100 flex items-center justify-center">
                            <img src={imageUrl} alt={lesson.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-4xl text-white">
                                    ▶
                                </div>
                            </div>
                        </div>

                        <div className="p-8 sm:p-12">
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <span className="bg-tawfeek-primary/10 text-tawfeek-primary font-bold px-4 py-1.5 rounded-full text-sm">
                                    {gradeName}
                                </span>
                                <span className="bg-gold/10 text-gold-dark font-bold px-4 py-1.5 rounded-full text-sm">
                                    {subjectName}
                                </span>
                                {lesson.isFree && (
                                    <span className="bg-green-100 text-green-700 font-bold px-4 py-1.5 rounded-full text-sm">
                                        حصة مجانية
                                    </span>
                                )}
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-black text-tawfeek-primary mb-4 leading-tight">
                                {lesson.title}
                            </h1>

                            <p className="text-lg text-gray-600 mb-8 leading-relaxed font-medium">
                                {lesson.description || 'انضم الآن لمشاهدة التفاصيل الكاملة لشرح هذه الحصة والمشاركة في الاختبارات المرفقة.'}
                            </p>

                            <div className="bg-offwhite rounded-2xl p-6 border border-earth/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">هل أنت مستعد لبدء المذاكرة؟</h3>
                                    <p className="text-sm text-gray-500">سجل حسابك الآن لتتمكن من مشاهدة الفيديو وحل التدريبات.</p>
                                </div>
                                <div className="flex gap-4 w-full sm:w-auto">
                                    <Link href="/login" className="btn-secondary flex-1 sm:flex-none text-center">
                                        تسجيل الدخول
                                    </Link>
                                    <Link href="/register" className="btn-primary flex-1 sm:flex-none text-center">
                                        حساب جديد
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
