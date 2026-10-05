'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminDashboardOverview() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/overview')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="h-64 bg-gray-200 rounded-xl" />
                    <div className="h-64 bg-gray-200 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-red-500 font-bold">خطأ في تحميل بيانات لوحة التحكم</div>;

    const { students } = data;
    const isOverLimit = students.isLimitExceeded;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">نظرة عامة على المنصة</h1>
                    <p className="text-gray-500 text-sm mt-1">متابعة إحصائيات الطلاب والاشتراكات والعروض</p>
                </div>
                {students.pending > 0 && (
                    <Link href="/admin/students?status=pending" className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md animate-pulse flex items-center gap-2">
                        <span>⏳</span> يوجد {students.pending} طلب تسجيل معلق!
                    </Link>
                )}
            </div>

            {/* Warning if Limit Exceeded */}
            {isOverLimit && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-amber-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <h3 className="font-bold text-lg text-amber-900">تنبيه تجاوز حد الطلاب المجانيين</h3>
                            <p className="text-sm text-amber-800 mt-1">
                                العدد الحالي للطلاب المجانيين <strong>({students.freeSlotsFilled})</strong> يتجاوز الحد الأقصى الجديد المحدد في الإعدادات <strong>({students.freeLimit})</strong>.
                                لن يتم إلغاء اشتراكات الطلاب الحاليين، وسيتم توقيف منح العرض المجاني للطلاب الجدد تلقائياً.
                            </p>
                        </div>
                    </div>
                    <Link href="/admin/settings" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold shrink-0 hover:bg-amber-700 transition-colors">
                        تعديل الإعدادات
                    </Link>
                </div>
            )}

            {/* Main Primary Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatWidget
                    title="إجمالي الطلاب"
                    value={students.total}
                    subValue={`${students.active} مقبول | ${students.pending} معلق`}
                    icon="👥"
                    color="blue"
                    link="/admin/students"
                />
                <StatWidget
                    title="الطلاب المجانيين"
                    value={`${students.freeSlotsFilled} / ${students.freeLimit}`}
                    subValue={`المتبقي: ${students.freeSlotRemaining} مقعد (${students.usagePercentage}%)`}
                    icon="🎁"
                    color="green"
                    link="/admin/free-students"
                />
                <StatWidget
                    title="الاشتراكات النشطة"
                    value={students.activeSubscriptions || 0}
                    subValue={`${students.expiredSubscriptions || 0} منتهي`}
                    icon="⭐"
                    color="purple"
                    link="/admin/subscriptions/requests"
                />
                <StatWidget
                    title="طلبات الدفع المعلقة"
                    value={students.pendingPayments || 0}
                    subValue="تحتاج مراجعة الإدارة"
                    icon="💳"
                    color="yellow"
                    link="/admin/subscriptions/requests?status=pending"
                />
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatWidget
                    title="الحصص الدراسية"
                    value={data.content.totalLessons}
                    subValue={`${data.content.publishedLessons} حصة منشورة`}
                    icon="🎬"
                    color="blue"
                    link="/admin/lessons"
                />
                <StatWidget
                    title="بنك الأسئلة والامتحانات"
                    value={data.content.totalQuizzes + data.content.weeklyExams}
                    subValue={`${data.content.monthlyExams} امتحان شهري`}
                    icon="📝"
                    color="purple"
                    link="/admin/exams"
                />
                <StatWidget
                    title="دعوات الطلاب (الرابط)"
                    value={data.referrals.total}
                    subValue={`${data.referrals.rewarded} دعوة مكتملة`}
                    icon="🔗"
                    color="green"
                    link="/admin/gamification"
                />
                <StatWidget
                    title="النقاط الممنوحة"
                    value={data.gamification.totalPointsAwarded}
                    subValue="إجمالي نقاط المنصة"
                    icon="🪙"
                    color="yellow"
                    link="/admin/gamification"
                />
            </div>

            {/* Phase 2 Management Tools */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2">
                    <span suppressHydrationWarning>⚡</span> أدوات وإدارات المرحلة الثانية
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        href="/admin/tasks"
                        className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🎯</span>
                        <div>
                            <div className="font-bold text-sm text-blue-900">إدارة المهام</div>
                            <div className="text-xs text-blue-700">تعيين واجبات وتحديات</div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/achievements"
                        className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🏆</span>
                        <div>
                            <div className="font-bold text-sm text-amber-900">الأوسمة والإنجازات</div>
                            <div className="text-xs text-amber-700">تحفيز وتكريم الطلاب</div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/student-mistakes"
                        className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🔍</span>
                        <div>
                            <div className="font-bold text-sm text-rose-900">تحليل الأخطاء</div>
                            <div className="text-xs text-rose-700">متابعة الأسئلة الشائعة</div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/questions/import"
                        className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>📥</span>
                        <div>
                            <div className="font-bold text-sm text-emerald-900">استيراد الأسئلة</div>
                            <div className="text-xs text-emerald-700">تحليل وإدخال تلقائي</div>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Registration Chart/Info */}
                <div className="card">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span>📈</span> الطلاب الجدد آخر 7 أيام
                    </h3>
                    <div className="space-y-4">
                        {data.charts.registrationsByDay.length > 0 ? (
                            data.charts.registrationsByDay.map((day: any) => (
                                <div key={day._id} className="flex items-center gap-4">
                                    <div className="w-24 text-sm text-gray-500">{day._id}</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                                        <div
                                            className="bg-tawfeek-green h-full rounded-full"
                                            style={{ width: `${Math.min(100, (day.count / 20) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="w-8 text-left font-bold">{day.count}</div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center text-sm py-8">لا يوجد تسجيلات في الأيام الماضية</p>
                        )}
                    </div>
                </div>

                {/* Free Student Status Widget with Progress Bar */}
                <div className="card flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                <span>🎁</span> حالة إعدادات الطلاب المجانيين
                            </h3>
                            <Link href="/admin/settings" className="text-xs text-tawfeek-primary font-bold hover:underline">
                                تعديل الحد الإقصى ⚙️
                            </Link>
                        </div>

                        <div className="flex flex-col items-center justify-center py-4 bg-offwhite rounded-2xl p-6 border border-earth/30">
                            <div className="text-5xl font-black text-forest mb-2">
                                {students.freeSlotsFilled} <span className="text-2xl text-gray-400">/ {students.freeLimit}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4 font-bold">طالب مجاني مسجل ومستفيد حالياً</p>

                            <div className="w-full bg-gray-200 rounded-full h-5 mb-3 overflow-hidden p-0.5">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${isOverLimit ? 'bg-rose-500' : students.usagePercentage >= 90 ? 'bg-amber-500' : 'bg-tawfeek-green'}`}
                                    style={{ width: `${Math.min(100, students.usagePercentage)}%` }}
                                />
                            </div>

                            <div className="flex justify-between w-full text-xs font-bold text-gray-600 px-1">
                                <span>النسبة المستخدمة: {students.usagePercentage}%</span>
                                <span>المتبقي: {students.freeSlotRemaining} مقعد</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t flex items-center justify-between">
                        <div className="text-xs text-gray-500 font-bold">
                            حالة العرض: {students.freeOfferEnabled ? <span className="text-emerald-600 font-black">✓ مفعّل</span> : <span className="text-rose-600 font-black">✗ معطّل</span>}
                        </div>
                        <Link href="/admin/free-students" className="btn-primary text-xs py-2 px-4">
                            عرض قائمة الطلاب المجانيين →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}


function StatWidget({ title, value, subValue, icon, color, link }: any) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        yellow: 'bg-amber-50 text-amber-700 border-amber-100',
    };

    return (
        <Link href={link} className="block transition-transform hover:-translate-y-1">
            <div className={`border rounded-2xl p-5 ${colors[color]} hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="text-3xl" suppressHydrationWarning>{icon}</div>
                </div>
                <div className="text-3xl font-black text-gray-900 mb-1">{value}</div>
                <div className="font-bold text-sm mb-1 text-gray-800">{title}</div>
                {subValue && <div className="text-xs font-medium text-gray-600">{subValue}</div>}
            </div>
        </Link>
    );
}


