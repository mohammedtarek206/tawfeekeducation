'use client';

import { useState } from 'react';

export default function SetupPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState<any>(null);

    const handleSetup = async () => {
        setStatus('loading');
        setMessage('');
        setDetails(null);

        try {
            // The setup key is the first 16 chars of JWT_SECRET
            // hardcoded here for the initial setup use only
            const setupKey = 'tawfeek-super-se';

            const res = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setupKey,
                    // Uses env defaults: ADMIN_SEED_PHONE & ADMIN_SEED_PASSWORD
                }),
            });

            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setMessage(data.message);
                setDetails(data.data);
            } else {
                setStatus('error');
                setMessage(data.message);
            }
        } catch {
            setStatus('error');
            setMessage('فشل الاتصال بالخادم');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#123C32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl',
            padding: '1rem',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '1.5rem',
                padding: '2.5rem',
                maxWidth: '440px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <div style={{
                    width: '64px', height: '64px',
                    background: '#C9A227',
                    borderRadius: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '2rem',
                }}>⚙️</div>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#123C32', marginBottom: '0.5rem' }}>
                    إعداد حساب الأدمن
                </h1>
                <p style={{ color: '#7A8C85', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    سيتم إنشاء أو تحديث حساب المدير بالبيانات الافتراضية.
                </p>

                {/* Default credentials */}
                <div style={{
                    background: '#F7F4ED',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'right',
                }}>
                    <div style={{ fontSize: '0.75rem', color: '#7A8C85', fontWeight: 700, marginBottom: '0.5rem' }}>
                        بيانات الدخول الافتراضية:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1D2925', marginBottom: '0.25rem' }}>
                        📱 رقم الهاتف: <strong dir="ltr">01000000000</strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1D2925' }}>
                        🔑 كلمة المرور: <strong dir="ltr">Admin@123456</strong>
                    </div>
                </div>

                {status === 'success' && (
                    <div style={{
                        background: '#d1fae5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '1rem',
                        color: '#065f46',
                        fontWeight: 600,
                    }}>
                        {message}
                        {details && (
                            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 400 }}>
                                📱 {details.phone} — {details.name}
                            </div>
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <div style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '1rem',
                        color: '#7f1d1d',
                    }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={handleSetup}
                    disabled={status === 'loading' || status === 'success'}
                    style={{
                        width: '100%',
                        background: status === 'success' ? '#d1fae5' : '#C9A227',
                        color: status === 'success' ? '#065f46' : '#fff',
                        border: 'none',
                        borderRadius: '0.75rem',
                        padding: '0.875rem',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: status === 'loading' || status === 'success' ? 'not-allowed' : 'pointer',
                        fontFamily: 'Cairo, sans-serif',
                        transition: 'all 0.2s',
                    }}
                >
                    {status === 'loading' ? '⏳ جاري الإعداد...'
                        : status === 'success' ? '✅ تم الإعداد بنجاح'
                            : '🚀 إنشاء / تحديث حساب الأدمن'}
                </button>

                {status === 'success' && (
                    <a
                        href="/admin/login"
                        style={{
                            display: 'block',
                            marginTop: '1rem',
                            background: '#123C32',
                            color: '#fff',
                            borderRadius: '0.75rem',
                            padding: '0.875rem',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '1rem',
                        }}
                    >
                        → الذهاب لتسجيل دخول الأدمن
                    </a>
                )}

                <p style={{
                    marginTop: '1.5rem',
                    fontSize: '0.75rem',
                    color: '#7A8C85',
                }}>
                    ⚠️ هذه الصفحة للإعداد الأولي فقط. احذفها من الكود بعد الاستخدام.
                </p>
            </div>
        </div>
    );
}
