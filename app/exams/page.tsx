import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'امتحانات الدراسات الاجتماعية والتاريخ | منصة التوفيق',
    description:
        'امتحانات وأسئلة الدراسات الاجتماعية والتاريخ للمرحلة الإعدادية والثانوية مع منصة التوفيق.',
    keywords: ['امتحانات الدراسات الاجتماعية', 'أسئلة الدراسات', 'أسئلة التاريخ', 'امتحانات منصة التوفيق'],
    openGraph: {
        title: 'امتحانات الدراسات الاجتماعية والتاريخ | منصة التوفيق',
        description: 'امتحانات وأسئلة تفاعلية مع منصة التوفيق.',
        locale: 'ar_EG',
        type: 'website',
    },
};

export default function ExamsPage() {
    return <BlockedFeaturePage
        emoji="📊"
        title="الامتحانات الشاملة"
        desc={
            <p>
                الامتحانات الأسبوعية والشهرية مصممة خصيصاً لتضعك في جو الامتحانات الحقيقي وتقييم مستواك بشكل دقيق.
                <br /><br />
                سجل الآن، اختبر نفسك، واعرف مستواك بناءً على نتائجك الدقيقة.
            </p>
        }
    />;
}
