import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'امتحانات الدراسات الاجتماعية والجغرافيا والتاريخ | أبو زيد',
    description:
        'امتحانات وأسئلة الدراسات الاجتماعية والجغرافيا والتاريخ للمرحلة الإعدادية والثانوية مع أستاذ أبو زيد.',
    keywords: ['امتحانات الدراسات الاجتماعية', 'أسئلة الجغرافيا', 'أسئلة التاريخ', 'أبو زيد امتحانات'],
    openGraph: {
        title: 'امتحانات الدراسات الاجتماعية والجغرافيا والتاريخ | أبو زيد',
        description: 'امتحانات وأسئلة تفاعلية مع أستاذ أبو زيد.',
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
