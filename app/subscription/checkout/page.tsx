'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SubscriptionCheckoutRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');

    useEffect(() => {
        if (planId) {
            router.replace(`/student/subscriptions/${planId}/checkout`);
        } else {
            router.replace('/student/subscriptions');
        }
    }, [planId, router]);

    return (
        <div className="min-h-screen bg-offwhite flex items-center justify-center p-6 text-center">
            <div className="text-gray-600 font-bold text-lg">جاري التوجيه لصفحة الدفع...</div>
        </div>
    );
}

export default function PublicSubscriptionCheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-offwhite flex items-center justify-center p-6 text-center">جاري التحميل...</div>}>
            <SubscriptionCheckoutRedirect />
        </Suspense>
    );
}
