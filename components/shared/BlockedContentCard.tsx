'use client';

import Link from 'next/link';

interface BlockedContentCardProps {
    reason?: 'pending_approval' | 'subscription_expired' | 'no_subscription' | 'rejected' | 'suspended' | string;
    title?: string;
    message?: string;
}

export default function BlockedContentCard({ reason = 'no_subscription', title, message }: BlockedContentCardProps) {
    let defaultTitle = 'هذا المحتوى متاح للمشتركين فقط 🔒';
    let defaultMessage = 'اشترك في إحدى الباقات المتاحة للوصول إلى المحتوى والاستفادة من جميع المميزات والدروس.';
    let buttonText = 'عرض الاشتراكات';
    let buttonHref = '/subscriptions';

    if (reason === 'subscription_expired') {
        defaultTitle = 'انتهى اشتراكك ⌛';
        defaultMessage = 'لقد انتهت فترة اشتراكك الحالية. يرجى تجديد الاشتراك للوصول إلى جميع الدروس والاختبارات والمراجعات.';
        buttonText = 'تجديد الاشتراك';
        buttonHref = '/subscriptions';
    } else if (reason === 'pending_approval') {
        defaultTitle = 'حسابك ما زال قيد المراجعة ⏳';
        defaultMessage = 'تم تسجيل حسابك بنجاح، وسيتاح لك الاشتراك والدخول فور موافقة الإدارة على الحساب.';
        buttonText = 'عرض حالة الحساب';
        buttonHref = '/pending';
    } else if (reason === 'rejected') {
        defaultTitle = 'تم رفض الحساب ❌';
        defaultMessage = 'عفواً، تم رفض تفعيل حسابك من قبل الإدارة.';
        buttonText = 'التواصل مع الدعم';
        buttonHref = '/#contact';
    } else if (reason === 'suspended') {
        defaultTitle = 'الحساب معلق ⚠️';
        defaultMessage = 'تم تعليق حسابك مؤقتاً، يرجى التواصل مع الإدارة.';
        buttonText = 'التواصل مع الدعم';
        buttonHref = '/#contact';
    }

    const displayTitle = title || defaultTitle;
    const displayMessage = message || defaultMessage;

    return (
        <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-forest/20 shadow-xl max-w-2xl mx-auto text-center my-8 animate-fadeIn">
            <div className="w-20 h-20 bg-forest/10 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 border border-forest/20">
                🔒
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-forest mb-4 leading-tight">
                {displayTitle}
            </h2>

            <p className="text-gray-600 text-base md:text-lg mb-8 leading-relaxed max-w-lg mx-auto">
                {displayMessage}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href={buttonHref}
                    className="btn-gold px-8 py-3.5 text-base font-bold shadow-lg shadow-gold/20 w-full sm:w-auto"
                >
                    {buttonText}
                </Link>

                <Link
                    href="/student/dashboard"
                    className="btn-outline px-8 py-3.5 text-base font-bold w-full sm:w-auto"
                >
                    العودة للرئيسية
                </Link>
            </div>
        </div>
    );
}
