'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// noindex for /login is enforced via middleware X-Robots-Tag header

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');
    const planId = searchParams.get('planId');

    const [form, setForm] = useState({ phone: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                if (data.requiresOTP) {
                    router.push(`/verify-otp?phone=${encodeURIComponent(form.phone)}`);
                    return;
                }
                if (data.status === 'pending') {
                    const pendingUrl = planId ? `/pending?planId=${planId}` : '/pending';
                    router.push(pendingUrl);
                    return;
                }
                setError(data.message || 'حدث خطأ');
                return;
            }

            // Redirect based on role and callback
            const role = data.data.user.role;
            if (role === 'parent') {
                router.push('/parent/dashboard');
            } else {
                if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
                    router.push(callbackUrl);
                } else if (planId) {
                    router.push(`/student/subscriptions/${planId}/checkout`);
                } else {
                    router.push('/student/dashboard');
                }
            }
            router.refresh();
        } catch {
            setError('حدث خطأ في الاتصال، حاول مرة أخرى');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-offwhite relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 geo-grid-bg opacity-40 pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-forest/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fadeInUp">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex flex-col items-center gap-3 mb-4">
                        <div className="w-28 h-28 rounded-2xl shadow-lg border border-earth/30 flex items-center justify-center overflow-hidden">
                            <img src="/لوجو.jpg" alt="لوجو منصة التوفيق" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-2xl font-black text-forest">منصة التوفيق</h1>
                    </Link>
                    <p className="text-[#7A8C85] font-medium mt-1">مرحباً بك مجدداً 👋</p>
                </div>

                {/* Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-forest border border-earth/40 p-8">
                    <h2 className="text-2xl font-bold text-darktext mb-6 text-center">تسجيل الدخول</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="input-label" htmlFor="phone">رقم الهاتف</label>
                            <input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                placeholder="01xxxxxxxxx"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="input-field"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="input-label mb-0" htmlFor="password">كلمة المرور</label>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="input-field"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full text-center justify-center"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    جاري الدخول...
                                </span>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-muted text-sm font-medium">
                            ليس لديك حساب؟{' '}
                            <Link href={`/register${planId ? `?planId=${planId}` : callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className="text-gold font-bold hover:text-gold-dark transition-colors">
                                سجل الآن
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="text-center mt-6">
                    <Link href="/" className="text-[#7A8C85] font-bold hover:text-forest text-sm transition-colors">
                        &larr; العودة للرئيسية
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-offwhite flex items-center justify-center p-4">جاري التحميل...</div>}>
            <LoginForm />
        </Suspense>
    );
}
