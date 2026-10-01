import type { Metadata } from 'next';

// noindex: login page should not appear in search engines
export const metadata: Metadata = {
    title: 'تسجيل الدخول | أبو زيد',
    robots: {
        index: false,
        follow: false,
    },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
