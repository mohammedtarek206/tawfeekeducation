import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'نظام الجوائز والنقاط | منصة التوفيق',
    description:
        'اجمع النقاط واكسب الجوائز من خلال دراسة الدراسات الاجتماعية والتاريخ مع منصة التوفيق.',
    robots: { index: false, follow: false },
};

export default function RewardsPage() {
    return <BlockedFeaturePage
        emoji="🎁"
        title="نظام الجوائز والمكافآت"
        desc={
            <p>
                ذاكر واجتهد واربح معنا! كل حصة وكويز وامتحان تجتازه يمنحك نقاطاً تضاف إلى رصيدك.
                <br /><br />
                اجمع النقاط واستبدلها بهدايا وجوائز قيمة. انضم الآن للبدء في تجميع نقاطك.
            </p>
        }
    />;
}
