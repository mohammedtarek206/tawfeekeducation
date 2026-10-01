'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils/helpers';

export default function AdminLoginForm() {
    const router = useRouter();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            console.log('[Admin Login] Status:', res.status, 'Response:', data);

            if (!res.ok || !data.success) {
                setError(data.message || `خطأ (${res.status}): فشل تسجيل الدخول`);
                return;
            }

            // Force a full browser navigation to ensure middleware evaluates fresh cookies natively
            window.location.href = '/admin/dashboard';
        } catch (err) {
            console.error('[Admin Login] Network error:', err);
            setError('حدث خطأ في الاتصال بالخادم — تحقق من الاتصال بالإنترنت');
        } finally {
            // Only stop loading if we caught an error, otherwise let it load until navigation completes
        }
    };

    return (
        <div className="min-h-screen bg-forest geo-grid-bg relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fadeInUp">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white border border-earth/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-black/20 text-forest">
                        <span className="font-black text-2xl">ت</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">لوحة تحكم الإدارة</h1>
                    <p className="text-white/60 text-sm mt-2">قم بتسجيل الدخول للمتابعة</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                            <input
                                type="text"
                                dir="ltr"
                                className="w-full border border-earth/40 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest text-left text-darktext"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                            <input
                                type="password"
                                dir="ltr"
                                className="w-full border border-earth/40 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest text-left text-darktext"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-forest text-white rounded-lg py-3 font-semibold hover:bg-[#1A5044] transition-colors flex justify-center items-center shadow-lg hover:shadow-xl"
                        >
                            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
                        ← العودة للمنصة
                    </Link>
                </div>
            </div>
        </div>
    );
}
