'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gradeLabel } from '@/lib/constants/grades';
import { formatDate } from '@/lib/utils/helpers';

export default function StudentProfilePage() {
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/student/profile');
            const json = await res.json();
            if (json.success) {
                setProfileData(json.data);
                setName(json.data.user?.name || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSaveName = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch('/api/student/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const json = await res.json();
            setMessage(json.message);
            if (json.success) {
                setIsEditingName(false);
                fetchProfile();
            }
        } catch {
            setMessage('حدث خطأ أثناء حفظ الاسم');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-forest font-bold animate-pulse max-w-5xl mx-auto py-20">
                جاري تحميل الملف الشخصي...
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="p-8 text-center text-rose-500 font-bold max-w-5xl mx-auto py-20">
                تعذر تحميل بيانات الملف الشخصي.
            </div>
        );
    }

    const { user, subscriptions = [], progress, enrolledLessons = [] } = profileData;
    const hasActiveSub = user.subscriptionStatus === 'active' || user.isFreeStudent;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fadeIn pb-24">
            {/* Header Title */}
            <div>
                <h1 className="text-3xl sm:text-4xl font-black text-darktext">الملف الشخصي للطالب</h1>
                <p className="text-gray-500 text-sm mt-1">إدارة معلوماتك الشخصية ومتابعة اشتراكاتك والتقدم الدراسي.</p>
            </div>

            {message && (
                <div className="p-4 rounded-2xl bg-forest/10 border border-forest/20 text-forest text-sm font-bold">
                    {message}
                </div>
            )}

            {/* Section 1: Personal Info Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-earth/30 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-earth/20 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-forest text-white font-black text-2xl rounded-2xl flex items-center justify-center border-2 border-gold shadow-md shrink-0">
                            {user.name ? user.name.charAt(0) : 'ط'}
                        </div>
                        <div>
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="border border-earth/40 rounded-xl px-3 py-1.5 font-bold text-darktext text-lg focus:outline-none focus:ring-2 focus:ring-forest"
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={saving}
                                        className="px-4 py-1.5 bg-forest text-white rounded-xl font-bold text-xs hover:bg-forest-dark transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'حفظ...' : 'حفظ'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setName(user.name);
                                            setIsEditingName(false);
                                        }}
                                        className="px-3 py-1.5 text-gray-500 font-bold text-xs hover:bg-gray-100 rounded-xl"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-darktext">{user.name}</h2>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="text-xs text-forest font-bold bg-forest/10 hover:bg-forest/20 px-2.5 py-1 rounded-lg transition-colors"
                                    >
                                        ✏️ تعديل الاسم
                                    </button>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1 font-mono">رقم الهاتف: {user.phone}</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-forest/10 text-forest text-xs font-bold px-3 py-1.5 rounded-xl border border-forest/20">
                            المرحلة: {gradeLabel(user.grade)}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${user.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            حالة الحساب: {user.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="bg-offwhite p-4 rounded-2xl border border-earth/20">
                        تاريخ إنشاء الحساب: <strong className="text-darktext block mt-1" suppressHydrationWarning>{formatDate(user.createdAt)}</strong>
                    </div>
                    <div className="bg-offwhite p-4 rounded-2xl border border-earth/20">
                        حالة الاشتراك الحالية: <strong className={`block mt-1 ${hasActiveSub ? 'text-emerald-700 font-extrabold' : 'text-rose-600 font-extrabold'}`}>{hasActiveSub ? 'نشط 🟢' : 'غير نشط / منتهي 🔴'}</strong>
                    </div>
                    <div className="bg-offwhite p-4 rounded-2xl border border-earth/20">
                        النقاط التراكمية: <strong className="text-forest font-mono block mt-1">{user.points || 0} نقطة</strong>
                    </div>
                </div>
            </div>

            {/* Section 2: No Active Subscription Alert */}
            {!hasActiveSub && user.status === 'approved' && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                    <div>
                        <h3 className="text-xl font-black text-amber-950 mb-1">لا يوجد اشتراك نشط حالياً ⚠️</h3>
                        <p className="text-amber-800 text-sm">اشترك في إحدى الباقات المتاحة أو استفد من العرض المجاني للوصول لكافة المحتويات.</p>
                    </div>
                    <Link
                        href="/subscriptions"
                        className="btn-gold px-6 py-3 text-sm font-bold shrink-0 shadow-md"
                    >
                        عرض الاشتراكات
                    </Link>
                </div>
            )}

            {/* Section 3: Subscriptions History */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-earth/30">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-darktext">اشتراكاتي 💳</h3>
                    <Link href="/subscriptions" className="text-xs font-bold text-forest hover:underline">
                        + إضافة/تجديد اشتراك
                    </Link>
                </div>

                {subscriptions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-offwhite rounded-2xl border border-earth/20 font-bold text-sm">
                        لا توجد سجلات اشتراك سابقة.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subscriptions.map((sub: any) => {
                            const isExpired = new Date(sub.endDate) < new Date() || sub.status === 'expired';
                            return (
                                <div
                                    key={sub._id}
                                    className="p-5 rounded-2xl border border-gray-100 bg-offwhite/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-darktext text-base">
                                                {sub.planId?.name || (sub.source === 'free_offer' ? 'العرض المجاني' : 'اشتراك الصف الدراسي')}
                                            </span>
                                            <span className="text-xs bg-forest/10 text-forest px-2.5 py-0.5 rounded-full font-bold">
                                                {gradeLabel(sub.gradeId)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 space-x-3 space-x-reverse" suppressHydrationWarning>
                                            <span>تاريخ البدء: {formatDate(sub.startDate)}</span>
                                            <span>|</span>
                                            <span>تاريخ الانتهاء: {formatDate(sub.endDate)}</span>
                                            <span>|</span>
                                            <span>المصدر: {sub.source === 'free_offer' ? 'عرض مجاني' : sub.source === 'payment' ? 'دفع إلكتروني' : 'إدارة'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${!isExpired && sub.status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                }`}
                                        >
                                            {!isExpired && sub.status === 'active' ? 'نشط' : 'منتهي'}
                                        </span>
                                        {isExpired && (
                                            <Link
                                                href="/subscriptions"
                                                className="px-4 py-1.5 bg-forest text-white text-xs font-bold rounded-xl hover:bg-forest-dark transition-colors"
                                            >
                                                تجديد الاشتراك
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Section 4: Progress & Analytics */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-earth/30">
                <h3 className="text-xl font-black text-darktext mb-6">التقدم الدراسي والإنجازات 📊</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
                    <div className="bg-forest/5 border border-forest/20 p-4 rounded-2xl">
                        <div className="text-xs text-gray-500 font-bold mb-1">نسبة الإنجاز بالحبر</div>
                        <div className="text-2xl font-black text-forest font-mono">{progress?.progressPercentage || 0}%</div>
                    </div>
                    <div className="bg-gold/10 border border-gold/20 p-4 rounded-2xl">
                        <div className="text-xs text-gray-500 font-bold mb-1">الدروس المكتملة</div>
                        <div className="text-2xl font-black text-gold-dark font-mono">{progress?.completedLessonsCount || 0} / {progress?.totalLessons || 0}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                        <div className="text-xs text-gray-500 font-bold mb-1">الاختبارات المحلولة</div>
                        <div className="text-2xl font-black text-emerald-800 font-mono">{progress?.totalExamsSolved || 0}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
                        <div className="text-xs text-gray-500 font-bold mb-1">متوسط الدرجات</div>
                        <div className="text-2xl font-black text-purple-800 font-mono">{progress?.avgScore || 0}%</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-2">
                        <span>التقدم الكلي في منهج {gradeLabel(user.grade)}</span>
                        <span>{progress?.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-earth/20">
                        <div
                            className="h-full bg-gradient-to-r from-forest to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress?.progressPercentage || 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Section 5: Enrolled Courses & Lessons */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-earth/30">
                <h3 className="text-xl font-black text-darktext mb-6">الكورسات والحصص الخاصة بي 📚</h3>

                {enrolledLessons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-offwhite rounded-2xl border border-earth/20 font-bold text-sm">
                        لا توجد دروس متاحة حالياً لصفك الدراسي.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enrolledLessons.map((lesson: any) => (
                            <div
                                key={lesson._id}
                                className="p-4 rounded-2xl border border-earth/20 bg-offwhite/40 flex items-center justify-between gap-4"
                            >
                                <div>
                                    <div className="text-xs text-forest font-bold mb-0.5">وحدة: {lesson.unit}</div>
                                    <div className="font-extrabold text-darktext text-sm sm:text-base">{lesson.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">النقاط: +{lesson.points || 10}</div>
                                </div>
                                <div>
                                    <Link
                                        href={`/student/lessons/${lesson._id}`}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${lesson.isCompleted
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : 'bg-forest text-white hover:bg-forest-dark'
                                            }`}
                                    >
                                        {lesson.isCompleted ? '✓ مكتمل' : 'متابعة التعلم'}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
