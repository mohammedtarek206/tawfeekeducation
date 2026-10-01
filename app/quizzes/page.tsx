import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'كويزات وتدريبات الدراسات والجغرافيا والتاريخ | أبو زيد',
    description:
        'كويزات وتدريبات قصيرة بعد كل درس في الدراسات الاجتماعية والجغرافيا والتاريخ مع أستاذ أبو زيد.',
    openGraph: {
        title: 'كويزات الدراسات والجغرافيا والتاريخ | أبو زيد',
        description: 'كويزات وتدريبات تفاعلية بعد كل درس مع أبو زيد.',
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
