import type { Metadata } from 'next';
import { gradeLabel, ACTIVE_GRADES } from '@/lib/constants/grades';
import connectDB from '@/lib/db/connect';
import { getLeaderboard } from '@/lib/gamification/engine';
import { getHonorBoardSettings } from '@/lib/settings/honorBoard';
import Link from 'next/link';

// ─── صفحة SSR عامة — قابلة للفهرسة بـ Google ───────────────────────────────
// لا تتطلب تسجيل دخول — البيانات تُجلب من الخادم مباشرة
export const dynamic = 'force-dynamic';
export const revalidate = 60; // إعادة توليد كل دقيقة

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tawfeekaltwfiq.com';

// ─── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
    title: 'لوحة الشرف | أوائل طلاب منصة التوفيق',
    description:
        'لوحة شرف منصة التوفيق التعليمية — أوائل الطلاب المتميزين في الدراسات الاجتماعية والتاريخ، مرتبون تلقائياً حسب النقاط التعليمية المحققة.',
    keywords: [
        'لوحة شرف منصة التوفيق',
        'أوائل طلاب التوفيق',
        'ترتيب طلاب التوفيق',
        'أفضل طلاب الدراسات الاجتماعية',
        'نقاط طلاب منصة التوفيق',
    ],
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: `${SITE_URL}/leaderboard`,
    },
    openGraph: {
        type: 'website',
        locale: 'ar_EG',
        url: `${SITE_URL}/leaderboard`,
        siteName: 'منصة التوفيق',
        title: 'لوحة الشرف | أوائل طلاب منصة التوفيق',
        description:
            'لوحة شرف منصة التوفيق — أوائل الطلاب المتميزين مرتبون تلقائياً حسب النقاط التعليمية.',
        images: [
            {
                url: `${SITE_URL}/لوجو.jpg`,
                width: 800,
                height: 800,
                alt: 'لوحة شرف منصة التوفيق',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'لوحة الشرف | منصة التوفيق',
        description: 'أوائل طلاب منصة التوفيق التعليمية مرتبون حسب النقاط.',
        images: [`${SITE_URL}/لوجو.jpg`],
    },
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PublicLeaderboardEntry {
    rank: number;
    name: string;
    avatar: string | null;
    grade: string;
    level: number;
    points: number;
}

// ─── Rank Badge Component ───────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-2xl" aria-label="المركز الأول">🥇</span>;
    if (rank === 2) return <span className="text-2xl" aria-label="المركز الثاني">🥈</span>;
    if (rank === 3) return <span className="text-2xl" aria-label="المركز الثالث">🥉</span>;
    return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-700 text-xs font-black">
            #{rank}
        </span>
    );
}

// ─── Avatar Component (عرض الحرف الأول فقط إذا لا توجد صورة) ────────────────
function StudentAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
    const initials = name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0] ?? '')
        .join('');

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={`صورة الطالب ${name}`}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
        );
    }

    return (
        <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 text-white font-black flex items-center justify-center text-xs border-2 border-white shadow-sm"
            aria-hidden="true"
        >
            {initials || 'ط'}
        </div>
    );
}

// ─── Main Page (Server Component) ──────────────────────────────────────────────
export default async function PublicLeaderboardPage() {
    // جلب البيانات على الخادم (SSR حقيقي — Google يقرأ المحتوى مباشرة)
    let leaderboard: PublicLeaderboardEntry[] = [];
    let enabled = true;
    let disabledMessage = '';
    let totalHonored = 0;
    let topStudentName: string | null = null;

    try {
        await connectDB();
        const settings = await getHonorBoardSettings();

        if (!settings.enabled) {
            enabled = false;
            disabledMessage =
                'لوحة الشرف متوقفة حاليًا بقرار من إدارة المنصة لأعمال التحديث وتدقيق النقاط.';
        } else {
            const rawData = await getLeaderboard({
                limit: settings.limit,
                includeZeroPoints: settings.showZeroPoints,
            });

            leaderboard = rawData.map((item) => ({
                rank: item.rank,
                name: item.name,
                avatar: item.avatar ?? null,
                grade: item.grade ?? '',
                level: item.level,
                points: item.points,
            }));

            totalHonored = leaderboard.length;
            topStudentName = leaderboard[0]?.name ?? null;
        }
    } catch (err) {
        console.error('[PublicLeaderboard] DB error:', err);
        enabled = false;
        disabledMessage = 'تعذّر تحميل البيانات. يرجى المحاولة لاحقاً.';
    }

    // ─── JSON-LD Structured Data (مساعد لـ Google لفهم القائمة) ───────────────
    const structuredData = enabled && leaderboard.length > 0
        ? {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'لوحة شرف منصة التوفيق',
              description:
                  'أوائل طلاب منصة التوفيق التعليمية مرتبون حسب النقاط التعليمية المحققة',
              url: `${SITE_URL}/leaderboard`,
              numberOfItems: totalHonored,
              itemListElement: leaderboard.slice(0, 10).map((entry) => ({
                  '@type': 'ListItem',
                  position: entry.rank,
                  name: entry.name,
                  description: `المركز ${entry.rank} — ${entry.points.toLocaleString('ar-EG')} نقطة — ${gradeLabel(entry.grade) || 'طالب متميز'}`,
              })),
          }
        : null;

    const topThree = leaderboard.filter((e) => e.rank <= 3);
    const restStudents = leaderboard.filter((e) => e.rank > 3);

    return (
        <>
            {structuredData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
            )}

            <div
                className="min-h-screen bg-gray-50"
                dir="rtl"
                lang="ar"
            >
                {/* ─── Header ─────────────────────────────────────────── */}
                <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white py-10 px-4 shadow-xl">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold mb-4">
                            <span>✨</span>
                            <span>الترتيب التلقائي وفق النقاط الفعلية</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
                            🏆 لوحة الشرف
                        </h1>
                        <p className="text-white/80 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-medium">
                            نخبة طلاب منصة التوفيق الأكثر تميزاً واجتهاداً، مرتبون تلقائياً حسب
                            النقاط التعليمية المحققة من الحصص والاختبارات والإنجازات.
                        </p>
                        {totalHonored > 0 && (
                            <div className="mt-4 inline-block bg-white/10 border border-white/20 px-5 py-2 rounded-2xl text-sm font-bold">
                                {totalHonored} طالب متصدر في اللوحة
                            </div>
                        )}
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                    {/* ─── Disabled State ───────────────────────────────── */}
                    {!enabled && (
                        <section className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-10 text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                                ⏸️
                            </div>
                            <h2 className="text-xl font-black text-amber-950">
                                لوحة الشرف متوقفة مؤقتًا
                            </h2>
                            <p className="text-sm text-amber-800 max-w-md mx-auto leading-relaxed">
                                {disabledMessage}
                            </p>
                        </section>
                    )}

                    {/* ─── Empty State ───────────────────────────────────── */}
                    {enabled && leaderboard.length === 0 && (
                        <section className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm space-y-4">
                            <div className="text-5xl">🏆</div>
                            <h2 className="text-xl font-black text-gray-800">
                                لا يوجد طلاب متصدرون حاليًا
                            </h2>
                            <p className="text-sm text-gray-500 max-w-md mx-auto">
                                سجّل الآن وكن أول من يحتل المركز الأول!
                            </p>
                        </section>
                    )}

                    {/* ─── Top 3 Podium ─────────────────────────────────── */}
                    {enabled && topThree.length > 0 && (
                        <section aria-labelledby="podium-title">
                            <div className="text-center mb-6">
                                <h2
                                    id="podium-title"
                                    className="text-2xl font-black text-gray-900 flex items-center justify-center gap-2"
                                >
                                    <span>🌟</span>
                                    <span>أوائل منصة التوفيق</span>
                                </h2>
                                <p className="text-xs text-gray-400 font-semibold mt-1">
                                    أعلى الطلاب رصيداً للنقاط التعليمية
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                                {/* عرض ترتيب المنصة: 2 ثم 1 ثم 3 */}
                                {([2, 1, 3] as const).map((rankNum) => {
                                    const entry = topThree.find((e) => e.rank === rankNum);
                                    if (!entry) return null;

                                    const isFirst = rankNum === 1;
                                    const bgClass = isFirst
                                        ? 'bg-gradient-to-b from-amber-50 to-amber-100/70 border-amber-400'
                                        : rankNum === 2
                                        ? 'bg-gradient-to-b from-slate-50 to-slate-100/70 border-slate-300'
                                        : 'bg-gradient-to-b from-orange-50 to-orange-100/70 border-orange-300';

                                    return (
                                        <article
                                            key={entry.rank}
                                            className={`rounded-3xl border-2 ${bgClass} p-6 text-center relative ${isFirst ? 'shadow-xl sm:-translate-y-4' : 'shadow-md'}`}
                                            aria-label={`المركز ${entry.rank}: ${entry.name}`}
                                        >
                                            <div className="flex justify-center mb-3">
                                                <StudentAvatar
                                                    name={entry.name}
                                                    avatarUrl={entry.avatar}
                                                />
                                            </div>
                                            <h3 className="font-black text-gray-900 text-lg truncate mb-1">
                                                {entry.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-semibold">
                                                {gradeLabel(entry.grade) || 'طالب متميز'}
                                            </p>
                                            <div className="mt-4 pt-3 border-t border-black/5">
                                                <div className="text-xs text-gray-500 font-medium">
                                                    مجموع النقاط
                                                </div>
                                                <div className="text-2xl font-black text-emerald-700">
                                                    {entry.points.toLocaleString('ar-EG')}
                                                    <span className="text-xs font-bold mr-1">
                                                        نقطة
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                                <RankBadge rank={entry.rank} />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ─── Full Table ────────────────────────────────────── */}
                    {enabled && leaderboard.length > 0 && (
                        <section
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                            aria-labelledby="table-title"
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2
                                        id="table-title"
                                        className="font-black text-gray-900 text-base flex items-center gap-2"
                                    >
                                        <span>📋</span>
                                        <span>ترتيب لوحة الشرف التلقائي</span>
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        مرتب تنازلياً حسب مجموع النقاط الفعلي لكل طالب
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                    إجمالي: {totalHonored} طالب
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" aria-label="لوحة شرف منصة التوفيق">
                                    <thead>
                                        <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold">
                                            <th scope="col" className="px-6 py-3.5 text-right w-20">المركز</th>
                                            <th scope="col" className="px-6 py-3.5 text-right">الطالب</th>
                                            <th scope="col" className="px-6 py-3.5 text-right hidden sm:table-cell">الصف الدراسي</th>
                                            <th scope="col" className="px-6 py-3.5 text-center hidden md:table-cell">المستوى</th>
                                            <th scope="col" className="px-6 py-3.5 text-center">النقاط</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {leaderboard.map((entry) => (
                                            <tr
                                                key={`${entry.rank}-${entry.name}`}
                                                className={`transition-colors hover:bg-gray-50/60 ${entry.rank <= 3 ? 'bg-amber-50/20' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <RankBadge rank={entry.rank} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <StudentAvatar
                                                            name={entry.name}
                                                            avatarUrl={entry.avatar}
                                                        />
                                                        <span className="font-bold text-gray-900">
                                                            {entry.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell">
                                                    <span className="px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
                                                        {gradeLabel(entry.grade) || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center hidden md:table-cell">
                                                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                                                        المستوى {entry.level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-black text-base text-gray-800">
                                                        {entry.points.toLocaleString('ar-EG')}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mr-1 font-semibold">
                                                        نقطة
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 text-center font-medium">
                                ⭐ يتم تحديث لوحة الشرف تلقائياً وفق النقاط الفعلية المحققة
                            </div>
                        </section>
                    )}

                    {/* ─── CTA: سجّل الآن ───────────────────────────────── */}
                    <section className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-3xl p-8 text-center text-white shadow-lg">
                        <h2 className="text-xl font-black mb-2">
                            هل أنت طالب في منصة التوفيق؟
                        </h2>
                        <p className="text-white/80 text-sm mb-5 max-w-md mx-auto">
                            سجّل الآن وابدأ رحلتك نحو القمة — اكسب النقاط من خلال الحصص
                            والاختبارات وأثبت تميزك في لوحة الشرف!
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href="/register"
                                className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-6 py-3 rounded-2xl text-sm transition-colors shadow-md"
                            >
                                سجّل الآن مجاناً 🚀
                            </Link>
                            <Link
                                href="/login"
                                className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-colors"
                            >
                                تسجيل الدخول
                            </Link>
                        </div>
                    </section>
                </main>

                {/* ─── Footer ──────────────────────────────────────────── */}
                <footer className="text-center py-6 text-xs text-gray-400 font-medium">
                    <p>
                        منصة التوفيق التعليمية —{' '}
                        <Link href="/" className="text-emerald-600 hover:underline">
                            العودة للصفحة الرئيسية
                        </Link>
                    </p>
                </footer>
            </div>
        </>
    );
}
