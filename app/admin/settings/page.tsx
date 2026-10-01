'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [dirty, setDirty] = useState<Record<string, any>>({});

    const fetchInitialData = async () => {
        try {
            const [resSet, resStats] = await Promise.all([
                fetch('/api/admin/settings'),
                fetch('/api/public/free-stats')
            ]);
            const jsonSet = await resSet.json();
            const jsonStats = await resStats.json();

            if (jsonSet.success) setSettings(jsonSet.data.settings);
            if (jsonStats.success) setStats(jsonStats.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleChange = (key: string, value: any) => {
        setDirty(prev => ({ ...prev, [key]: value }));
    };

    const getValue = (key: string, defaultVal: any = '') => {
        if (dirty[key] !== undefined) return dirty[key];
        if (settings[key] !== undefined) return settings[key];
        return defaultVal;
    };

    const handleSave = async () => {
        if (Object.keys(dirty).length === 0) return;

        // Validation for free_student_limit
        if (dirty['free_student_limit'] !== undefined) {
            const val = Number(dirty['free_student_limit']);
            if (isNaN(val) || val < 1) {
                setError('الحد الأقصى للطلاب المجانيين يجب أن يكون عدداً صحيحاً أكبر من أو يساوي 1');
                return;
            }
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const updates = Object.entries(dirty).map(([key, value]) => {
                let parsedVal = value;
                if (key === 'free_offer_enabled') {
                    parsedVal = Boolean(value);
                } else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
                    parsedVal = Number(value);
                }
                return { key, value: parsedVal };
            });

            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });
            const data = await res.json();

            if (!data.success) {
                setError(data.message || 'حدث خطأ في حفظ الإعدادات');
                return;
            }

            setSettings(prev => {
                const updated = { ...prev };
                updates.forEach(({ key, value }) => { updated[key] = value; });
                return updated;
            });
            setDirty({});
            setSuccess('تم حفظ الإعدادات وتحديث العروض بنجاح ✅');

            // Refresh stats
            fetchInitialData();

            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError('حدث خطأ في الاتصال بالسيرفر');
        } finally {
            setSaving(false);
        }
    };

    const currentFreeLimit = Number(getValue('free_student_limit', stats?.freeLimit || 100));
    const currentFreeCount = stats?.freeSlotsFilled || 0;
    const isOverLimit = currentFreeCount > currentFreeLimit;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">إعدادات المنصة والعروض</h1>
                    <p className="text-gray-500 text-sm mt-1">التحكم الديناميكي في حد الطلاب المجانيين، العروض، ونقاط المكافآت</p>
                </div>
                {Object.keys(dirty).length > 0 && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary self-start py-3 px-6 text-base font-bold shadow-lg shadow-forest/20 disabled:opacity-50"
                    >
                        {saving ? 'جاري الحفظ...' : `💾 حفظ التغييرات (${Object.keys(dirty).length})`}
                    </button>
                )}
            </div>

            {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 font-bold text-sm">{success}</div>}
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 font-bold text-sm">{error}</div>}

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <>
                    {/* SECTION 1: FREE STUDENTS & OFFER SETTINGS */}
                    <div className="bg-white rounded-3xl border border-earth/40 shadow-sm p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
                            <div>
                                <span className="bg-tawfeek-green/10 text-tawfeek-green text-xs font-bold px-3 py-1 rounded-full">التحكم في العروض</span>
                                <h2 className="text-2xl font-black text-forest mt-2">إعدادات الطلاب المجانيين (Free Students Settings)</h2>
                                <p className="text-gray-500 text-sm mt-1">تحديد العدد الأقصى وتفعيل أو إيقاف العرض المجاني سيرفر-سايد</p>
                            </div>
                            <Link href="/admin/free-students" className="px-4 py-2 bg-offwhite hover:bg-earth/20 border text-forest text-xs font-bold rounded-xl shrink-0 transition-colors">
                                قائمة الطلاب المجانيين ({stats?.freeSlotsFilled || 0}) ←
                            </Link>
                        </div>

                        {/* Live Statistics Preview Card */}
                        <div className="bg-offwhite rounded-2xl p-6 border border-earth/30 mb-8">
                            <h3 className="font-bold text-forest mb-4 text-sm flex items-center gap-2">
                                📊 معاينة حالية لاستخدام المقاعد المجانية
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center mb-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <div className="text-xs text-gray-500 font-bold mb-1">الطلاب المجانيون المسجلون</div>
                                    <div className="text-2xl font-black text-forest">{currentFreeCount}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <div className="text-xs text-gray-500 font-bold mb-1">الحد الأقصى المحدد</div>
                                    <div className="text-2xl font-black text-forest">{currentFreeLimit}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <div className="text-xs text-gray-500 font-bold mb-1">المقاعد المتبقية</div>
                                    <div className="text-2xl font-black text-emerald-600">{Math.max(0, currentFreeLimit - currentFreeCount)}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <div className="text-xs text-gray-500 font-bold mb-1">نسبة الاستهلاك</div>
                                    <div className="text-2xl font-black text-amber-600">{Math.min(100, Math.round((currentFreeCount / Math.max(1, currentFreeLimit)) * 100))}%</div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                                <div
                                    className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-rose-500' : 'bg-tawfeek-green'}`}
                                    style={{ width: `${Math.min(100, Math.round((currentFreeCount / Math.max(1, currentFreeLimit)) * 100))}%` }}
                                />
                            </div>

                            {/* Warning if over limit */}
                            {isOverLimit && (
                                <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs font-bold leading-relaxed">
                                    ⚠️ تنبيه: العدد الحالي للطلاب المجانيين ({currentFreeCount}) يتجاوز الحد الجديد المحدد ({currentFreeLimit}). لن يتم إلغاء الاشتراكات الحالية، وسيتم توقيف منح العرض للطلاب الجدد حتى يصبح العدد ضمن الحد.
                                </div>
                            )}
                        </div>

                        {/* Settings Controls */}
                        <div className="space-y-6">
                            {/* Free Offer Toggle */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-white">
                                <div>
                                    <div className="font-bold text-gray-900 text-base">تفعيل العرض المجاني</div>
                                    <div className="text-sm text-gray-500 mt-1">عند تفعيله يستمر السيرفر في قبول الطلاب المجانيين حتى الوصول للحد الأقصى</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(getValue('free_offer_enabled', true))}
                                            onChange={e => handleChange('free_offer_enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-forest"></div>
                                    </label>
                                    <span className="font-bold text-sm text-gray-700">
                                        {Boolean(getValue('free_offer_enabled', true)) ? 'مفعّل ON' : 'معطّل OFF'}
                                    </span>
                                </div>
                            </div>

                            {/* Free Students Limit Input */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-white">
                                <div>
                                    <div className="font-bold text-gray-900 text-base">الحد الأقصى للطلاب المجانيين (Free Students Maximum)</div>
                                    <div className="text-sm text-gray-500 mt-1">يُجلب هذا الرقم سيرفر-سايد وتأتي منه جميع الإحصائيات (100، 200، 500، ...)</div>
                                </div>
                                <div className="sm:w-48">
                                    <input
                                        type="number"
                                        min={1}
                                        value={getValue('free_student_limit', 100)}
                                        onChange={e => handleChange('free_student_limit', e.target.value)}
                                        className="input-field text-center font-black text-xl text-forest border-2 focus:border-forest"
                                    />
                                </div>
                            </div>

                            {/* Offer Title */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-white">
                                <div>
                                    <div className="font-bold text-gray-900 text-base">عنوان العرض المجاني</div>
                                    <div className="text-sm text-gray-500 mt-1">العنوان المعروض بالطرق الرسمية وحسابات الباقات</div>
                                </div>
                                <div className="sm:w-80">
                                    <input
                                        type="text"
                                        value={getValue('free_offer_title', `عرض مجاني لأول ${currentFreeLimit} طالب`)}
                                        onChange={e => handleChange('free_offer_title', e.target.value)}
                                        className="input-field font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Offer Duration */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-white">
                                <div>
                                    <div className="font-bold text-gray-900 text-base">مدة العرض المجاني (بالأيام)</div>
                                    <div className="text-sm text-gray-500 mt-1">المدة الزمانية للاشتراك المجاني عند قبوله (365 يوم = سنة دراسية كاملة)</div>
                                </div>
                                <div className="sm:w-48">
                                    <input
                                        type="number"
                                        min={1}
                                        value={getValue('free_offer_duration', 365)}
                                        onChange={e => handleChange('free_offer_duration', e.target.value)}
                                        className="input-field text-center font-bold text-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: GAMIFICATION & POINTS SETTINGS */}
                    <div className="bg-white rounded-3xl border border-earth/40 shadow-sm p-6 md:p-8">
                        <h2 className="text-2xl font-black text-forest border-b pb-4 mb-6">إعدادات النقاط والمكافآت (Points & Gamification)</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <GamificationSettingItem
                                label="نقاط مشاهدة الحصة"
                                desc="النقاط الممنوحة للطالب عند مشاهدة فيديو الحصة"
                                value={getValue('lesson_watch_points', 10)}
                                onChange={val => handleChange('lesson_watch_points', val)}
                            />
                            <GamificationSettingItem
                                label="نقاط إكمال الحصة"
                                desc="النقاط الممنوحة عند إكمال درس بالكامل"
                                value={getValue('lesson_complete_points', 20)}
                                onChange={val => handleChange('lesson_complete_points', val)}
                            />
                            <GamificationSettingItem
                                label="نقاط اجتياز الكويز"
                                desc="النقاط الممنوحة عند النجاح في كويز الدرس"
                                value={getValue('quiz_complete_points', 30)}
                                onChange={val => handleChange('quiz_complete_points', val)}
                            />
                            <GamificationSettingItem
                                label="نقاط الامتحان الأسبوعي"
                                desc="النقاط الممنوحة عند اجتياز الامتحان الأسبوعي"
                                value={getValue('weekly_exam_points', 50)}
                                onChange={val => handleChange('weekly_exam_points', val)}
                            />
                            <GamificationSettingItem
                                label="نقاط الامتحان الشهري"
                                desc="النقاط الممنوحة عند اجتياز الامتحان الشهري"
                                value={getValue('monthly_exam_points', 100)}
                                onChange={val => handleChange('monthly_exam_points', val)}
                            />
                            <GamificationSettingItem
                                label="نقاط إحالة طالب جديد"
                                desc="مكافأة الداعي عند موافقة الإدارة على الطالب"
                                value={getValue('referral_points', 30)}
                                onChange={val => handleChange('referral_points', val)}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Save Button Bar */}
            {Object.keys(dirty).length > 0 && (
                <div className="fixed bottom-6 left-6 right-6 md:left-12 md:right-72 bg-forest text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-50 animate-bounce">
                    <div className="font-bold text-sm">
                        ⚠️ يوجد ({Object.keys(dirty).length}) تغييرات غير محفوظة!
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-tawfeek-green hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات الآن'}
                    </button>
                </div>
            )}
        </div>
    );
}

function GamificationSettingItem({ label, desc, value, onChange }: { label: string; desc: string; value: any; onChange: (v: string) => void }) {
    return (
        <div className="p-4 rounded-2xl border border-gray-100 bg-offwhite/50 flex flex-col justify-between">
            <div className="mb-3">
                <div className="font-bold text-gray-900">{label}</div>
                <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </div>
            <input
                type="number"
                min={0}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="input-field text-center font-bold"
            />
        </div>
    );
}
