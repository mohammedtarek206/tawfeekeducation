'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParentContext } from '@/components/parent/ParentContext';

export default function LinkStudentPage() {
    const router = useRouter();
    const { refreshStudents, setSelectedStudentId } = useParentContext();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError('الرجاء إدخال كود الربط');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/parent/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkingCode: code }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || 'فشل في ربط الحساب');
            } else {
                setSuccess(data.message || 'تم ربط الطالب بنجاح');
                setCode('');
                await refreshStudents();
                if (data.data?.studentId) {
                    setSelectedStudentId(data.data.studentId);
                }
                setTimeout(() => {
                    router.push('/parent/dashboard');
                }, 2000);
            }
        } catch (err) {
            setError('حدث خطأ في الاتصال، حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-earth/30 text-center">
                <div className="w-20 h-20 bg-forest/5 rounded-full mx-auto flex items-center justify-center text-4xl mb-6 shadow-inner">
                    🔗
                </div>

                <h1 className="text-3xl font-black text-forest mb-4">ربط حساب طالب جديد</h1>
                <p className="text-gray-500 mb-8 leading-relaxed font-medium">
                    أدخل كود الربط الخاص بالطالب (يمكن الحصول عليه من حساب الطالب) لمتابعة أدائه ونتائجه.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6 border border-red-100 flex items-center justify-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-bold mb-6 border border-green-100 flex items-center justify-center gap-2">
                        <span>✅</span> {success}
                    </div>
                )}

                <form onSubmit={handleLink} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="مثال: TWF-ABCDE"
                            className="w-full text-center text-2xl tracking-widest font-bold bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-lg"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="w-full bg-forest text-white font-bold py-4 rounded-2xl hover:bg-forest-light transition-all active:scale-95 disabled:opacity-75 disabled:active:scale-100 shadow-md flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin text-xl">⏳</span> جاري الربط...
                            </>
                        ) : (
                            'تأكيد الربط'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
