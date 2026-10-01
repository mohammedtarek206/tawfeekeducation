import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
        rules: [
            {
                // Allow all crawlers for public pages
                userAgent: '*',
                allow: [
                    '/',
                    '/lessons',
                    '/exams',
                    '/quizzes',
                    '/solution-videos',
                    '/rewards',
                    '/about',
                    '/branches',
                ],
                disallow: [
                    '/admin/',
                    '/student/',
                    '/parent/',
                    '/api/',
                    '/login',
                    '/register',
                    '/verify-otp',
                    '/pending',
                    '/setup',
                    '/subscription/',
                    '/_next/',
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}
