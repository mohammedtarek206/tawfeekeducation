import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'فيديوهات حل الدراسات الاجتماعية والتاريخ | منصة التوفيق',
    description:
        'فيديوهات حل التمارين والكتب الخارجية والاختبارات في الدراسات الاجتماعية والتاريخ مع منصة التوفيق.',
    openGraph: {
        title: 'فيديوهات الحل | منصة التوفيق',
        description: 'حلول تفصيلية للتمارين والاختبارات مع منصة التوفيق.',
        locale: 'ar_EG',
        type: 'website',
    },
};

export default function SolutionVideosPage() {
    return <BlockedFeaturePage
        emoji="🎥"
        title="فيديوهات الحل"
        desc={
            <p>
                هذا القسم يحتوي على المكتبة الكاملة لفيديوهات حل التمارين والكتب الخارجية والاختبارات تفصيلياً مع منصة التوفيق.
                <br /><br />
                يجب تسجيل الدخول او إنشاء حساب جديد للوصول لهذه الفيديوهات.
            </p>
        }
    />;
}
