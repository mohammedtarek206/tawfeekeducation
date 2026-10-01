'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';

export default function ParentRegister() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            setError('كلمات المرور غير متطابقة');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/parent/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    password: form.password,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'حدث خطأ أثناء التسجيل');
            } else {
                router.push('/login?type=parent'); // Route properly handles role
            }
        } catch (e) {
            setError('حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-tawfeek-bg flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-28 pb-16 px-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-tawfeek-border p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-tawfeek-primary/5 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">
                            👨‍👩‍👧‍👦
                        </div>
                        <h1 className="text-2xl font-black text-tawfeek-primary">حساب ولي أمر جديد</h1>
                        <p className="text-gray-500 mt-2 text-sm">أنشئ حسابك الآن لمتابعة تطور ونتائج أبنائك</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">الاسم بالكامل</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-primary focus:ring-1 focus:ring-tawfeek-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">رقم الهاتف</label>
                            <input
                                type="tel"
                                required
                                pattern="01[0-9]{9}"
                                placeholder="01xxxxxxxxx"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-primary focus:ring-1 focus:ring-tawfeek-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">كلمة المرور</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-primary focus:ring-1 focus:ring-tawfeek-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={form.confirmPassword}
                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-primary focus:ring-1 focus:ring-tawfeek-primary transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-tawfeek-primary text-white font-bold py-3.5 rounded-xl hover:bg-tawfeek-primary-light transition-all active:scale-95 disabled:opacity-75 mt-4"
                        >
                            {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-gray-500">
                        لديك حساب بالفعل؟ <Link href="/login" className="text-tawfeek-primary hover:underline">تسجيل الدخول</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
