'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';

function ParentLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams?.get('callbackUrl') || '/parent/dashboard';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        phone: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: form.phone,
                    password: form.password,
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || 'بيانات الدخول غير صحيحة');
                setLoading(false);
            } else {
                if (data.data?.user?.role !== 'parent') {
                    setError('عذراً، هذا الحساب ليس مسجلاً كولي أمر');
                    setLoading(false);
                    return;
                }
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (e) {
            setError('حدث خطأ في الاتصال');
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-tawfeek-border p-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-forest/10 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">
                    👨‍👩‍👧‍👦
                </div>
                <h1 className="text-2xl font-black text-forest">دخول ولي الأمر</h1>
                <p className="text-gray-500 mt-2 text-sm">قم بتسجيل الدخول لمتابعة تطور ونتائج أبنائك</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center mb-6 border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">رقم الهاتف</label>
                    <input
                        type="tel"
                        required
                        pattern="01[0-9]{9}"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-forest focus:ring-1 focus:ring-forest text-left dir-ltr transition-all"
                        placeholder="01xxxxxxxxx"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">كلمة المرور</label>
                    <input
                        type="password"
                        required
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-forest text-white font-bold py-3.5 rounded-xl hover:bg-forest-light transition-all active:scale-95 disabled:opacity-75 mt-4"
                >
                    {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                </button>
            </form>

            <div className="mt-8 text-center text-sm font-medium text-gray-500">
                ليس لديك حساب ولي أمر؟ <Link href="/parent/register" className="text-forest hover:underline font-bold">إنشاء حساب جديد</Link>
            </div>
        </div>
    );
}

export default function ParentLoginPage() {
    return (
        <div className="min-h-screen bg-offwhite flex flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center pt-28 pb-16 px-4">
                <Suspense fallback={<div className="w-full max-w-md bg-white rounded-3xl h-96 animate-pulse" />}>
                    <ParentLoginForm />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
