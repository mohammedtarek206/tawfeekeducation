import type { Metadata } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import PWAInstallBanner from '@/components/PWAInstallBanner';

// ─── Site Constants ───────────────────────────────────────────────────────────
const SITE_NAME = 'أبو زيد للدراسات والجغرافيا والتاريخ';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOGO_URL = `${SITE_URL}/لوجو.jpg`;

// ─── Root Metadata (fallback for all pages) ───────────────────────────────────
export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `${SITE_NAME} | منصة تعليمية`,
        template: `%s | أبو زيد`,
    },
    description:
        'منصة أبو زيد التعليمية لشرح الدراسات والجغرافيا والتاريخ، مع الدروس والمراجعات والاختبارات للطلاب.',
    keywords: [
        'أبو زيد للدراسات',
        'أبو زيد جغرافيا',
        'أبو زيد تاريخ',
        'شرح الدراسات الاجتماعية',
        'شرح الجغرافيا',
        'شرح التاريخ',
        'دروس الدراسات الاجتماعية',
        'امتحانات الدراسات الاجتماعية',
        'الدراسات الاجتماعية للصف الثالث الإعدادي',
        'الدراسات الاجتماعية للصف الأول الثانوي',
    ],
    authors: [{ name: 'أبو زيد', url: SITE_URL }],
    creator: 'أبو زيد للدراسات والجغرافيا والتاريخ',
    publisher: 'أبو زيد للدراسات والجغرافيا والتاريخ',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'ar_EG',
        url: SITE_URL,
        siteName: SITE_NAME,
        title: `${SITE_NAME} | منصة تعليمية`,
        description:
            'منصة أبو زيد التعليمية لشرح الدراسات والجغرافيا والتاريخ، مع الدروس والمراجعات والاختبارات للطلاب.',
        images: [
            {
                url: LOGO_URL,
                width: 800,
                height: 800,
                alt: SITE_NAME,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: `${SITE_NAME} | منصة تعليمية`,
        description:
            'منصة أبو زيد التعليمية لشرح الدراسات والجغرافيا والتاريخ والمراجعات والاختبارات.',
        images: [LOGO_URL],
    },
    alternates: {
        canonical: SITE_URL,
    },
};

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: SITE_NAME,
        alternateName: 'Abu Zaid',
        url: SITE_URL,
        logo: LOGO_URL,
        description:
            'منصة تعليمية متخصصة في الدراسات الاجتماعية والجغرافيا والتاريخ لطلاب المرحلة الإعدادية والثانوية في مصر.',
        areaServed: 'EG',
        inLanguage: 'ar',
        teaches: ['الدراسات الاجتماعية', 'الجغرافيا', 'التاريخ'],
    };

    return (
        <html lang="ar" dir="rtl" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap"
                    rel="stylesheet"
                />
                <meta name="theme-color" content="#123C32" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="التوفيق" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="application-name" content="التوفيق" />
                <meta name="msapplication-TileColor" content="#123C32" />
                <link rel="apple-touch-icon" href="/لوجو.jpg" />
                <link rel="manifest" href="/manifest.json" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
            </head>
            <body className="font-arabic antialiased bg-white text-gray-900" suppressHydrationWarning>
                {children}
                <ServiceWorkerRegister />
                <PWAInstallBanner />
            </body>
        </html>
    );

}
