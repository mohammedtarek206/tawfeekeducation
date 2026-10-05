import { MetadataRoute } from 'next';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const now = new Date();

    // ─── Static Public Pages ─────────────────────────────────────────────────
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${siteUrl}/lessons`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/exams`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${siteUrl}/quizzes`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${siteUrl}/solution-videos`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${siteUrl}/rewards`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${siteUrl}/about`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${siteUrl}/branches`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ];

    // ─── Dynamic Lesson Pages (only published & showOnHomepage) ──────────────
    let lessonPages: MetadataRoute.Sitemap = [];
    try {
        await connectDB();
        const lessons = await Lesson.find({ isPublished: true, subject: { $ne: 'geography' } })
            .select('_id updatedAt')
            .lean()
            .limit(500);

        lessonPages = lessons.map((lesson) => ({
            url: `${siteUrl}/lessons#lesson-${lesson._id}`,
            lastModified: lesson.updatedAt ?? now,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        }));
    } catch {
        // If DB is unavailable, return static pages only
        console.warn('[Sitemap] Could not fetch lessons from DB');
    }

    return [...staticPages, ...lessonPages];
}
