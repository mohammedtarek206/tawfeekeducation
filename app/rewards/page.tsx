import BlockedFeaturePage from '@/components/public/BlockedFeaturePage';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'نظام الجوائز والنقاط | أبو زيد',
    description:
        'اجمع النقاط واكسب الجوائز من خلال دراسة الدراسات الاجتماعية والجغرافيا والتاريخ مع منصة أبو زيد.',
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
