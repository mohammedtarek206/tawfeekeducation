'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { ACTIVE_GRADES } from '@/lib/constants/grades';
import FreeOfferBanner from '@/components/shared/FreeOfferBanner';

const GOVERNORATES = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية',
    'المنوفية', 'القليوبية', 'الغربية', 'كفر الشيخ', 'الفيوم',
    'بني سويف', 'المنيا', 'سوهاج', 'قنا', 'أسوان', 'الأقصر',
    'أسيوط', 'البحيرة', 'دمياط', 'بورسعيد', 'الإسماعيلية',
    'السويس', 'شمال سيناء', 'جنوب سيناء', 'الوادي الجديد',
    'مطروح', 'البحر الأحمر',
];

type RegisterRole = 'student' | 'parent';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const callbackUrl = searchParams.get('callbackUrl');

    const [role, setRole] = useState<RegisterRole>('student');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
        parentName: '',
        parentPhone: '',
        grade: '',
        governorate: '',
        referralCode: '',
    });

    const handleChange = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateStep1 = () => {
        if (form.name.length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل';
        if (!/^01[0-9]{9}$/.test(form.phone)) return 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01)';
        if (form.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        if (form.password !== form.confirmPassword) return 'كلمتا المرور غير متطابقتين';
        return null;
    };

    const validateStep2 = () => {
        if (form.parentName.length < 2) return 'اسم ولي الأمر مطلوب';
        if (!/^01[0-9]{9}$/.test(form.parentPhone)) return 'رقم هاتف ولي الأمر غير صحيح';
        if (!form.grade) return 'يرجى اختيار الصف الدراسي';
        if (!form.governorate) return 'يرجى اختيار المحافظة';
        return null;
    };

    const handleNext = () => {
        const err = validateStep1();
        if (err) { setError(err); return; }
        setError('');
        setStep(2);
    };

    const handleSubmitStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validateStep2();
        if (err) { setError(err); return; }
        await submitRegistration('student');
    };

    const handleSubmitParent = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validateStep1();
        if (err) { setError(err); return; }
        await submitRegistration('parent');
    };

    const submitRegistration = async (submittingRole: string) => {
        setLoading(true);
        setError('');

        try {
            const body = submittingRole === 'student' ? {
                name: form.name,
                phone: form.phone,
                password: form.password,
                role: 'student',
                parentName: form.parentName,
                parentPhone: form.parentPhone,
                grade: form.grade,
                governorate: form.governorate,
                referralCode: form.referralCode || undefined,
            } : {
                name: form.name,
                phone: form.phone,
                password: form.password,
                role: 'parent',
            };

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'حدث خطأ');
                return;
            }

            if (submittingRole === 'student') {
                const pendingUrl = planId ? `/pending?planId=${planId}` : '/pending';
                router.push(pendingUrl);
            } else {
                router.push('/login');
            }
        } catch {
            setError('حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-offwhite relative overflow-hidden flex items-center justify-center p-4 py-12">
            <div className="absolute inset-0 geo-grid-bg opacity-40 pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-forest/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Free offer banner — compact, shown at top on mobile, side on desktop */}
            {role === 'student' && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 lg:hidden z-20">
                    <FreeOfferBanner compact studentGrade={form.grade || undefined} />
                </div>
            )}

            <div className="w-full max-w-5xl relative z-10 animate-fadeInUp">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Offer banner — desktop sidebar */}
                    {role === 'student' && (
                        <div className="hidden lg:block lg:w-80 flex-shrink-0 pt-0">
                            <FreeOfferBanner compact studentGrade={form.grade || undefined} />
                        </div>
                    )}
                    <div className="flex-1 w-full">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <Link href="/" className="inline-flex flex-col items-center gap-3 mb-3">
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-earth/30 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-forest/5" />
                                    <svg viewBox="0 0 32 32" fill="none" className="w-10 h-10 relative z-10">
                                        <circle cx="16" cy="16" r="12" stroke="#123C32" strokeWidth="1.5" />
                                        <circle cx="16" cy="16" r="7" stroke="#C9A227" strokeWidth="1" opacity="0.6" />
                                        <path d="M16 4 L18 14 L16 16 L14 14 Z" fill="#C9A227" />
                                        <path d="M16 28 L14 18 L16 16 L18 18 Z" fill="#123C32" opacity="0.7" />
                                        <circle cx="16" cy="16" r="2" fill="#C9A227" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-black text-forest">إنشاء حساب جديد</h1>
                            </Link>
                            <p className="text-muted font-medium mt-1 text-sm">انضم لمنصة التوفيق وابدأ رحلتك</p>
                        </div>

                        {/* Card */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-forest border border-earth/40 p-8">

                            <h2 className="text-xl font-bold text-darktext mb-4 text-center">أنا:</h2>

                            {/* Role Selection Tabs */}
                            <div className="flex bg-earth/20 p-1 rounded-xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setRole('student'); setStep(1); setError(''); }}
                                    className={clsx(
                                        "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                        role === 'student' ? "bg-white text-forest shadow-sm" : "text-darktext/60 hover:text-darktext"
                                    )}
                                >
                                    طالب
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setRole('parent'); setStep(1); setError(''); }}
                                    className={clsx(
                                        "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                        role === 'parent' ? "bg-white text-forest shadow-sm" : "text-darktext/60 hover:text-darktext"
                                    )}
                                >
                                    ولي أمر
                                </button>
                            </div>

                            {role === 'student' && (
                                <div className="flex items-center justify-center gap-4 mb-6">
                                    {[1, 2].map((s) => (
                                        <div key={s} className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${step >= s ? 'bg-forest text-white shadow-md' : 'bg-earth/30 text-[#7A8C85]'}`}>
                                                {s}
                                            </div>
                                            <span className={`font-bold text-sm ${step >= s ? 'text-forest' : 'text-[#7A8C85]'}`}>
                                                {s === 1 ? 'بياناتك' : 'بيانات إضافية'}
                                            </span>
                                            {s < 2 && <div className={`w-8 h-px ${step > s ? 'bg-forest' : 'bg-earth/40'}`} />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            {role === 'student' ? (
                                <>
                                    {step === 1 ? (
                                        <div className="space-y-5">
                                            <div>
                                                <label className="input-label">الاسم بالكامل</label>
                                                <input
                                                    type="text"
                                                    placeholder="محمد أحمد إبراهيم"
                                                    value={form.name}
                                                    onChange={(e) => handleChange('name', e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">رقم الهاتف</label>
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    placeholder="01xxxxxxxxx"
                                                    value={form.phone}
                                                    onChange={(e) => handleChange('phone', e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">كلمة المرور</label>
                                                <input
                                                    type="password"
                                                    placeholder="8 أحرف على الأقل"
                                                    value={form.password}
                                                    onChange={(e) => handleChange('password', e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">تأكيد كلمة المرور</label>
                                                <input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={form.confirmPassword}
                                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <button onClick={handleNext} className="btn-primary w-full">
                                                التالي ←
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmitStudent} className="space-y-5">
                                            <div>
                                                <label className="input-label">اسم ولي الأمر</label>
                                                <input
                                                    type="text"
                                                    placeholder="اسم الوالد أو الوالدة"
                                                    value={form.parentName}
                                                    onChange={(e) => handleChange('parentName', e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">رقم هاتف ولي الأمر</label>
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    placeholder="01xxxxxxxxx"
                                                    value={form.parentPhone}
                                                    onChange={(e) => handleChange('parentPhone', e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">الصف الدراسي</label>
                                                <select
                                                    value={form.grade}
                                                    onChange={(e) => handleChange('grade', e.target.value)}
                                                    className="input-field"
                                                >
                                                    <option value="">اختر الصف</option>
                                                    {ACTIVE_GRADES.map((g) => (
                                                        <option key={g.value} value={g.value}>{g.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="input-label">المحافظة</label>
                                                <select
                                                    value={form.governorate}
                                                    onChange={(e) => handleChange('governorate', e.target.value)}
                                                    className="input-field"
                                                >
                                                    <option value="">اختر المحافظة</option>
                                                    {GOVERNORATES.map((g) => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="input-label">
                                                    كود الدعوة <span className="text-gray-400 font-normal">(اختياري)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="TAWFEEK-XXXXX"
                                                    value={form.referralCode}
                                                    onChange={(e) => handleChange('referralCode', e.target.value.toUpperCase())}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className="btn-secondary flex-1"
                                                >
                                                    → رجوع
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="btn-primary flex-1"
                                                >
                                                    {loading ? 'جاري التسجيل...' : 'سجل الآن'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            ) : (
                                <form onSubmit={handleSubmitParent} className="space-y-5">
                                    <div>
                                        <label className="input-label">الاسم بالكامل</label>
                                        <input
                                            type="text"
                                            placeholder="اسم ولي الأمر"
                                            value={form.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">رقم الهاتف</label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="01xxxxxxxxx"
                                            value={form.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">كلمة المرور</label>
                                        <input
                                            type="password"
                                            placeholder="8 أحرف على الأقل"
                                            value={form.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">تأكيد كلمة المرور</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={form.confirmPassword}
                                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full"
                                    >
                                        {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
                                    </button>
                                </form>
                            )}

                            <div className="mt-6 text-center">
                                <p className="text-muted text-sm font-medium">
                                    لديك حساب؟{' '}
                                    <Link href={`/login${planId ? `?planId=${planId}` : callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className="text-gold font-bold hover:text-gold-dark transition-colors">
                                        سجل دخولك
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>{/* flex-1 */}
            </div>{/* flex row */}
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-offwhite flex items-center justify-center p-4">جاري التحميل...</div>}>
            <RegisterForm />
        </Suspense>
    );
}
