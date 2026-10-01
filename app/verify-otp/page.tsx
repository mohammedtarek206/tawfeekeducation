'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function OTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const phone = searchParams.get('phone') || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('يرجى إدخال الكود المكون من 6 أرقام');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp: otpCode }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'الكود غير صحيح');
                return;
            }

            router.push('/pending');
        } catch {
            setError('حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setResending(true);
        setError('');

        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'حدث خطأ');
                return;
            }

            setCountdown(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
        } catch {
            setError('حدث خطأ');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-offwhite relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 geo-grid-bg opacity-40 pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-forest/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fadeInUp">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-earth/40 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-forest/5" />
                        <span className="text-4xl relative z-10">📱</span>
                    </div>
                    <h1 className="text-2xl font-black text-forest">التحقق من الهاتف</h1>
                    <p className="text-[#7A8C85] mt-2 text-sm font-medium">
                        أرسلنا كود التحقق إلى{' '}
                        <span className="text-gold-dark font-bold" dir="ltr">{phone}</span>
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-forest border border-earth/40 p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* OTP Input */}
                    <div className="flex justify-center gap-3 mb-8" dir="ltr">
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                id={`otp-${i}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                onPaste={handlePaste}
                                className="w-12 h-14 text-center text-2xl font-black border-2 border-earth/60 rounded-xl
                                bg-white focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20
                                transition-all duration-200 text-darktext"
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleVerify}
                        disabled={loading || otp.join('').length !== 6}
                        className="btn-primary w-full mb-4"
                    >
                        {loading ? 'جاري التحقق...' : 'تحقق من الكود'}
                    </button>

                    <div className="text-center">
                        {canResend ? (
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="text-forest font-bold text-sm hover:underline"
                            >
                                {resending ? 'جاري الإرسال...' : 'إعادة إرسال الكود'}
                            </button>
                        ) : (
                            <p className="text-muted text-sm font-medium">
                                إعادة الإرسال بعد{' '}
                                <span className="text-forest font-bold">{countdown}</span> ثانية
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-center mt-6">
                    <Link href="/register" className="text-muted font-bold hover:text-forest text-sm transition-colors">
                        &larr; العودة للتسجيل
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-offwhite flex items-center justify-center">جاري التحميل...</div>}>
            <OTPContent />
        </Suspense>
    );
}
