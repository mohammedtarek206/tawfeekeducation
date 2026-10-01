import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'فيديوهات حل الدراسات والجغرافيا والتاريخ | أبو زيد',
    description:
        'فيديوهات حل التمارين والكتب الخارجية والاختبارات في الدراسات والجغرافيا والتاريخ مع أستاذ أبو زيد.',
    openGraph: {
        title: 'فيديوهات الحل | أبو زيد',
        description: 'حلول تفصيلية للتمارين والاختبارات مع أبو زيد.',
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
                هذا القسم يحتوي على المكتبة الكاملة لفيديوهات حل التمارين والكتب الخارجية والاختبارات تفصيلياً مع الأستاذ التوفيق.
                <br /><br />
                يجب تسجيل الدخول او إنشاء حساب جديد للوصول لهذه الفيديوهات.
            </p>
        }
    />;
}
