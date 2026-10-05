import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/public/Navbar';
import HeroSection from '@/components/public/HeroSection';
import OffersSection from '@/components/public/OffersSection';
import FeaturesSection from '@/components/public/FeaturesSection';
import PublicPlansSection from '@/components/public/PublicPlansSection';
import LatestLessons from '@/components/public/LatestLessons';
import GamificationSection from '@/components/public/GamificationSection';
import BranchesSection from '@/components/public/BranchesSection';
import CTASection from '@/components/public/CTASection';
import Footer from '@/components/public/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
    title: 'منصة التوفيق | التاريخ والدراسات الاجتماعية',
    description:
        'منصة التوفيق التعليمية لشرح الدراسات الاجتماعية والتاريخ للمرحلة الإعدادية والثانوية، مع الدروس والمراجعات والاختبارات والأسئلة التعليمية.',
    keywords: [
        'منصة التوفيق',
        'التوفيق للدراسات',
        'التوفيق تاريخ',
        'التوفيق دراسات',
        'شرح الدراسات الاجتماعية',
        'دروس الدراسات الاجتماعية',
        'مراجعة الدراسات الاجتماعية',
        'امتحانات الدراسات الاجتماعية',
        'شرح التاريخ',
    ],
    openGraph: {
        type: 'website',
        locale: 'ar_EG',
        url: SITE_URL,
        title: 'منصة التوفيق | التاريخ والدراسات الاجتماعية',
        description:
            'منصة التوفيق التعليمية لشرح الدراسات الاجتماعية والتاريخ للمرحلة الإعدادية والثانوية.',
        images: [{ url: `${SITE_URL}/لوجو.jpg`, alt: 'منصة التوفيق التعليمية' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'منصة التوفيق | التاريخ والدراسات الاجتماعية',
        description: 'منصة التوفيق التعليمية لشرح الدراسات الاجتماعية والتاريخ.',
        images: [`${SITE_URL}/لوجو.jpg`],
    },
    alternates: {
        canonical: SITE_URL,
    },
};

export default function HomePage() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <Suspense fallback={null}>
                    <OffersSection />
                </Suspense>
                <FeaturesSection />
                <PublicPlansSection />
                <LatestLessons />
                <GamificationSection />
                <BranchesSection />
                <CTASection />
            </main>
            <Footer />
        </>
    );
}
