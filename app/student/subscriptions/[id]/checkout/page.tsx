'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gradeLabel } from '@/lib/constants/grades';
import Link from 'next/link';

export default function CheckoutPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [plan, setPlan] = useState<any>(null);
    const [methods, setMethods] = useState<any[]>([]);
    const [accountStatus, setAccountStatus] = useState<string>('approved');
    const [existingPending, setExistingPending] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [transactionRef, setTransactionRef] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch plans & user status
                const resPlans = await fetch('/api/student/subscriptions/plans');
                const jsonPlans = await resPlans.json();
                if (jsonPlans.success) {
                    setAccountStatus(jsonPlans.data.accountStatus);

                    const found = jsonPlans.data.plans.find((p: any) => p._id === params.id);
                    if (found) setPlan(found);

                    const hasPending = jsonPlans.data.requestsHistory?.some((r: any) => r.status === 'pending');
                    if (hasPending) setExistingPending(true);
                }

                // Fetch payment methods
                const resMethods = await fetch('/api/student/subscriptions/payment-methods');
                const jsonMethods = await resMethods.json();
                if (jsonMethods.success) {
                    setMethods(jsonMethods.data.paymentMethods);
                    if (jsonMethods.data.paymentMethods.length > 0) {
                        setSelectedMethod(jsonMethods.data.paymentMethods[0]._id);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [params.id]);

    const handleSubmit = async () => {
        if (!selectedMethod) {
            alert('الرجاء اختيار طريقة دفع');
            return;
        }
        if (!file) {
            alert('الرجاء رفع صورة إثبات التحويل');
            return;
        }

        setUploading(true);
        setErrorMsg('');

        try {
            // Upload file
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) {
                alert('فشل رفع صورة إثبات الدفع');
                setUploading(false);
                return;
            }

            const methodDetail = methods.find(m => m._id === selectedMethod);

            const res = await fetch('/api/student/subscriptions/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: plan._id,
                    paymentMethod: methodDetail ? methodDetail.name : 'تحويل بنكي / محفظة',
                    transactionRef: transactionRef.trim() || undefined,
                    paymentProof: uploadData.url
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                setErrorMsg(result.message || 'حدث خطأ في تقديم الطلب');
                alert(result.message || 'حدث خطأ في تقديم الطلب');
                return;
            }

            alert('تم إرسال طلب الاشتراك بنجاح وجاري مراجعته من الإدارة 🎉');
            router.push('/student/subscriptions');
        } catch (error) {
            alert('حدث خطأ بالاتصال، يرجى إعادة المحاولة');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-gray-500 font-bold">
                جاري تحميل تفاصيل الباقة وطرق الدفع...
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="p-10 text-center max-w-lg mx-auto">
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl mb-6 font-bold">
                    الباقة غير موجودة أو غبر متاحة لصفك الدراسي
                </div>
                <Link href="/student/subscriptions" className="btn-primary">
                    العودة لصفحة الباقات
                </Link>
            </div>
        );
    }

    if (accountStatus === 'pending') {
        return (
            <div className="p-6 md:p-10 max-w-xl mx-auto min-h-screen">
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center shadow-md">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                        ⏳
                    </div>
                    <h2 className="text-2xl font-black text-amber-900 mb-3">حسابك قيد المراجعة من الإدارة</h2>
                    <p className="text-amber-800 text-base leading-relaxed mb-6">
                        يمكنك استكمال الدفع والاشتراك في باقة <strong className="text-forest underline">{plan.name}</strong> فور موافقة الإدارة على تفعيل حسابك.
                    </p>
                    <Link href="/pending" className="btn-primary w-full block text-center">
                        عرض حالة الحساب
                    </Link>
                </div>
            </div>
        );
    }

    if (existingPending) {
        return (
            <div className="p-6 md:p-10 max-w-xl mx-auto min-h-screen">
                <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8 text-center shadow-md">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                        📋
                    </div>
                    <h2 className="text-2xl font-black text-blue-900 mb-3">لديك طلب اشتراك قيد المراجعة</h2>
                    <p className="text-blue-800 text-base leading-relaxed mb-6">
                        لديك بالفعل طلب اشتراك مسبق جاري مراجعته من الإدارة. لا يمكنك تقديم طلب جديد حتى الانتهاء من الطلب الحالي.
                    </p>
                    <Link href="/student/subscriptions" className="btn-primary w-full block text-center">
                        عرض حالة الطلب الحالي
                    </Link>
                </div>
            </div>
        );
    }

    const isDiscountOffer = plan.offerEnabled && plan.offerType === 'DISCOUNT_FIRST_N';
    const remaining = plan.offerLimit - plan.offerUsed;
    const canClaim = remaining > 0;
    let finalPrice = plan.price;
    if (isDiscountOffer && canClaim && plan.discountPercentage) {
        finalPrice = plan.price - (plan.price * (plan.discountPercentage / 100));
    }

    const currentMethod = methods.find(m => m._id === selectedMethod);

    return (
        <div className="p-6 md:p-10 max-w-2xl mx-auto min-h-screen pb-32">
            <h1 className="text-3xl font-black text-forest mb-8 text-center">إتمام الاشتراك والتحويل</h1>

            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 text-sm text-center font-bold">
                    {errorMsg}
                </div>
            )}

            {/* Plan Details Summary */}
            <div className="bg-white rounded-3xl shadow-md border border-earth/40 p-6 md:p-8 mb-8">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <h2 className="text-xl font-black text-forest">تفاصيل الباقة</h2>
                    <span className="bg-forest/10 text-forest font-bold px-3 py-1 rounded-full text-xs">
                        {gradeLabel(plan.grade)}
                    </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">اسم الباقة:</span>
                    <span className="font-bold text-darktext text-lg">{plan.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">السعر الأصلي:</span>
                    <span className="font-bold">{plan.price} ج.م</span>
                </div>
                {isDiscountOffer && canClaim && (
                    <div className="flex justify-between items-center mb-2 text-tawfeek-green">
                        <span>خصم العرض ({plan.discountPercentage}%):</span>
                        <span className="font-bold font-mono">-{plan.price - finalPrice} ج.م</span>
                    </div>
                )}
                <div className="flex justify-between items-center mt-4 pt-4 border-t text-xl text-forest font-black">
                    <span>الإجمالي المستحق للدفع:</span>
                    <span className="text-2xl text-tawfeek-green font-black">{finalPrice} ج.م</span>
                </div>
            </div>

            {/* Payment Methods Section */}
            <div className="bg-white rounded-3xl shadow-md border border-earth/40 p-6 md:p-8 mb-8">
                <h2 className="text-xl font-black text-forest mb-6">اختر طريقة التحويل</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {methods.map(m => (
                        <div
                            key={m._id}
                            onClick={() => setSelectedMethod(m._id)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedMethod === m._id ? 'border-forest bg-forest/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className="font-black text-lg mb-1 text-forest">{m.name}</div>
                            <div className="font-mono text-xl font-bold text-tawfeek-green tracking-wider">{m.number}</div>
                            {m.accountName && <div className="text-xs text-gray-500 mt-1">الاسم: {m.accountName}</div>}
                        </div>
                    ))}
                </div>

                {currentMethod && (
                    <div className="bg-offwhite rounded-2xl p-5 border border-earth/40 mb-6">
                        <h3 className="font-bold text-forest mb-2">تعليمات التحويل:</h3>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                            {currentMethod.instructions || 'قم بتحويل المبلغ إلى الرقم الموضح أعلاه ثم ارفع صورة إشعار التحويل.'}
                        </p>
                    </div>
                )}

                {/* Optional Transaction Reference input */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        رقم الهاتف/المحفظة أو رقم المعاملة (اختياري):
                    </label>
                    <input
                        type="text"
                        placeholder="مثال: 01012345678 أو رقم الإيصال"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-forest/30"
                    />
                </div>

                {/* Proof File Upload */}
                <h2 className="text-lg font-bold text-forest mb-3">ارفع صورة إثبات التحويل / الإيصال *</h2>
                <div className="border-2 border-dashed border-earth/60 rounded-2xl p-8 text-center hover:bg-offwhite/50 transition-colors">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="max-w-full"
                        required
                    />
                    {file && (
                        <div className="mt-4 text-emerald-700 font-bold text-sm bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-200 inline-block">
                            ✓ تم اختيار الملف: {file.name}
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={uploading}
                className="w-full py-4 rounded-xl bg-forest text-white font-black text-lg hover:bg-forest/90 transition-colors shadow-lg shadow-forest/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading ? 'جاري رفع الإثبات والتسجيل...' : 'تأكيد وإرسال طلب الاشتراك'}
            </button>
        </div>
    );
}
