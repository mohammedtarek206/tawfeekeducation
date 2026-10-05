import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'كويزات وتدريبات الدراسات الاجتماعية والتاريخ | منصة التوفيق',
    description:
        'كويزات وتدريبات قصيرة بعد كل درس في الدراسات الاجتماعية والتاريخ مع منصة التوفيق.',
    openGraph: {
        title: 'كويزات الدراسات الاجتماعية والتاريخ | منصة التوفيق',
        description: 'كويزات وتدريبات تفاعلية بعد كل درس مع منصة التوفيق.',
        locale: 'ar_EG',
        type: 'website',
    },
};

export default function QuizzesPage() {
    return <BlockedFeaturePage
        emoji="📝"
        title="الكويزات والتدريبات"
        desc={
            <p>
                يحتوي هذا القسم على كويزات مستمرة وتدريبات قصيرة بعد كل حصة لتثبيت المعلومات والتأكد من استيعابك الكامل للشرح.
                <br /><br />
                يجب تسجيل الدخول أو إنشاء حساب لفتح الاختبارات والمشاركة!
            </p>
        }
    />;
}
