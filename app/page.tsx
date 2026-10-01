import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/public/Navbar';
import HeroSection from '@/components/public/HeroSection';
import FeaturesSection from '@/components/public/FeaturesSection';
import PublicPlansSection from '@/components/public/PublicPlansSection';
import LatestLessons from '@/components/public/LatestLessons';
import GamificationSection from '@/components/public/GamificationSection';
import BranchesSection from '@/components/public/BranchesSection';
import CTASection from '@/components/public/CTASection';
import Footer from '@/components/public/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
    title: 'أبو زيد للدراسات والجغرافيا والتاريخ | منصة تعليمية',
    description:
        'منصة أبو زيد التعليمية لشرح الدراسات الاجتماعية والجغرافيا والتاريخ للمرحلة الإعدادية والثانوية، مع الدروس والمراجعات والاختبارات والأسئلة التعليمية.',
    keywords: [
        'أبو زيد للدراسات',
        'أبو زيد جغرافيا',
        'أبو زيد تاريخ',
        'أبو زيد دراسات',
        'شرح الدراسات الاجتماعية',
        'دروس الدراسات الاجتماعية',
        'مراجعة الدراسات الاجتماعية',
        'امتحانات الدراسات الاجتماعية',
    ],
    openGraph: {
        type: 'website',
        locale: 'ar_EG',
        url: SITE_URL,
        title: 'أبو زيد للدراسات والجغرافيا والتاريخ | منصة تعليمية',
        description:
            'منصة أبو زيد التعليمية لشرح الدراسات الاجتماعية والجغرافيا والتاريخ للمرحلة الإعدادية والثانوية.',
        images: [{ url: `${SITE_URL}/لوجو.jpg`, alt: 'أبو زيد للدراسات والجغرافيا والتاريخ' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'أبو زيد للدراسات والجغرافيا والتاريخ | منصة تعليمية',
        description: 'منصة أبو زيد التعليمية لشرح الدراسات الاجتماعية والجغرافيا والتاريخ.',
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

