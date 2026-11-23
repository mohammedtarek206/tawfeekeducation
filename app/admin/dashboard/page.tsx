'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';

export default function AdminDashboardOverview() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [alertsData, setAlertsData] = useState<any>(null);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsCategory, setAlertsCategory] = useState('all');

    // Filter states
    const [grade, setGrade] = useState('');
    const [unit, setUnit] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const [dateRange, setDateRange] = useState('all');

    const loadOverview = () => {
        setLoading(true);
        const query = new URLSearchParams();
        if (grade) query.append('grade', grade);
        if (unit) query.append('unit', unit);
        if (subscriptionStatus) query.append('subscriptionStatus', subscriptionStatus);
        if (activityLevel) query.append('activityLevel', activityLevel);
        if (dateRange && dateRange !== 'all') query.append('dateRange', dateRange);

        fetch(`/api/admin/overview?${query.toString()}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    const loadAlerts = () => {
        setAlertsLoading(true);
        const query = new URLSearchParams();
        if (alertsCategory && alertsCategory !== 'all') query.append('category', alertsCategory);
        query.append('status', 'active');
        query.append('limit', '15');

        fetch(`/api/admin/alerts?${query.toString()}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setAlertsData(res.data);
            })
            .catch(() => { })
            .finally(() => setAlertsLoading(false));
    };

    useEffect(() => {
        loadOverview();
    }, [grade, unit, subscriptionStatus, activityLevel, dateRange]);

    useEffect(() => {
        loadAlerts();
    }, [alertsCategory]);

    const handleResolveAlert = async (alertId: string) => {
        try {
            const res = await fetch('/api/admin/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resolve', alertId }),
            });
            const result = await res.json();
            if (result.success) {
                loadAlerts();
                loadOverview();
            }
        } catch { }
    };

    const handleResolveAllAlerts = async () => {
        if (!confirm('هل أنت متأكد من تعليم جميع التنبيهات المعروضة كمعالجة؟')) return;
        try {
            const res = await fetch('/api/admin/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resolve_all', category: alertsCategory }),
            });
            const result = await res.json();
            if (result.success) {
                loadAlerts();
                loadOverview();
            }
        } catch { }
    };

    const resetFilters = () => {
        setGrade('');
        setUnit('');
        setSubscriptionStatus('');
        setActivityLevel('');
        setDateRange('all');
    };

    const hasActiveFilters = grade || unit || subscriptionStatus || activityLevel || dateRange !== 'all';

    if (loading && !data) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-28 bg-gray-200 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500 font-bold">خطأ في تحميل بيانات لوحة التحكم</div>;
    }

    const { students, subscriptions, leaderboards, alertsSummary } = data;
    const isOverLimit = subscriptions.isLimitExceeded;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">لوحة المتابعة والتحليلات الشاملة</h1>
                    <p className="text-gray-500 text-sm mt-1">متابعة إحصائيات تفاعل الطلاب، مشاهدات الفيديوهات، الاختبارات، والتنبيهات الذكية</p>
                </div>
                <div className="flex items-center gap-3">
                    {students.pending > 0 && (
                        <Link
                            href="/admin/students?status=pending"
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md animate-pulse flex items-center gap-2 transition-colors"
                        >
                            <span>⏳</span> يوجد {students.pending} طلب تسجيل معلق
                        </Link>
                    )}
                    {alertsSummary?.unresolvedCount > 0 && (
                        <a
                            href="#admin-alerts-section"
                            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-colors"
                        >
                            <span>🔔</span> {alertsSummary.unresolvedCount} تنبيه بحاجة لتدخل
                        </a>
                    )}
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span>🔍</span> تصفية المؤشرات والإحصائيات:
                    </span>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                        >
                            ✕ إعادة تعيين الفلاتر
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <select
                        className="input-field text-xs py-2"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                    >
                        <option value="">جميع الصفوف الدراسية</option>
                        {ACTIVE_GRADES.map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>

                    <select
                        className="input-field text-xs py-2"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                    >
                        <option value="">جميع الوحدات / الفصول</option>
                        {data.availableUnits?.map((u: string) => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>

                    <select
                        className="input-field text-xs py-2"
                        value={subscriptionStatus}
                        onChange={(e) => setSubscriptionStatus(e.target.value)}
                    >
                        <option value="">كل حالات الاشتراك</option>
                        <option value="active">اشتراك نشط</option>
                        <option value="free">اشتراك مجاني فقط</option>
                        <option value="paid">اشتراك مدفوع فقط</option>
                        <option value="expired">اشتراك منتهي</option>
                    </select>

                    <select
                        className="input-field text-xs py-2"
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value)}
                    >
                        <option value="">كل مستويات التفاعل</option>
                        <option value="highly_active">نشط جدًا (آخر 3 أيام)</option>
                        <option value="moderate">تفاعل متوسط (آخر أسبوع)</option>
                        <option value="inactive">خامل / منقطع (&gt; 7 أيام)</option>
                    </select>

                    <select
                        className="input-field text-xs py-2"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="all">كل الفترات الزمنية</option>
                        <option value="today">اليوم</option>
                        <option value="last_week">آخر أسبوع</option>
                        <option value="last_month">آخر شهر</option>
                    </select>
                </div>
            </div>

            {/* Smart Alerts Section */}
            <div id="admin-alerts-section" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔔</span>
                        <div>
                            <h2 className="font-bold text-gray-900 text-base">مركز التنبيهات الذكية والتدخل السريع</h2>
                            <p className="text-gray-500 text-xs">تنبيهات انقطاع الطلاب، قرب انتهاء الاشتراكات، والمدفوعات الجديدة</p>
                        </div>
                    </div>
                    {alertsData?.counts?.unresolved > 0 && (
                        <button
                            onClick={handleResolveAllAlerts}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                            ✓ معالجة كل التنبيهات
                        </button>
                    )}
                </div>

                {/* Alert Category Filter Pills */}
                <div className="flex flex-wrap gap-2 text-xs">
                    {[
                        { key: 'all', label: 'الكل', count: alertsData?.counts?.unresolved || 0 },
                        { key: 'inactivity', label: 'انقطاع وخمول ⚠️', count: alertsData?.counts?.byCategory?.inactivity || 0 },
                        { key: 'subscription', label: 'الاشتراكات ⏳', count: alertsData?.counts?.byCategory?.subscription || 0 },
                        { key: 'payment', label: 'المدفوعات 💳', count: alertsData?.counts?.byCategory?.payment || 0 },
                        { key: 'achievement', label: 'تفوق وإنجازات 🏆', count: alertsData?.counts?.byCategory?.achievement || 0 },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setAlertsCategory(tab.key)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                                alertsCategory === tab.key
                                    ? 'bg-forest text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className="bg-black/15 text-inherit px-1.5 py-0.2 rounded-full text-[10px]">
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Alerts List */}
                <div className="space-y-2">
                    {alertsLoading ? (
                        <div className="p-6 text-center text-gray-400 text-xs animate-pulse">جاري فحص ومزامنة التنبيهات...</div>
                    ) : !alertsData?.alerts || alertsData.alerts.length === 0 ? (
                        <div className="p-6 text-center text-emerald-600 bg-emerald-50/50 rounded-xl text-xs font-bold">
                            ✓ لا توجد تنبيهات معلقة حاليًا — جميع الأمور تسير بشكل مثالي!
                        </div>
                    ) : (
                        alertsData.alerts.map((alert: any) => {
                            const severityStyles: Record<string, string> = {
                                critical: 'border-rose-200 bg-rose-50/60 text-rose-900',
                                warning: 'border-amber-200 bg-amber-50/60 text-amber-900',
                                info: 'border-blue-200 bg-blue-50/60 text-blue-900',
                                success: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
                            };
                            return (
                                <div
                                    key={alert._id}
                                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                                        severityStyles[alert.severity] || severityStyles.info
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-base shrink-0 mt-0.5">
                                            {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : alert.severity === 'success' ? '🌟' : 'ℹ️'}
                                        </span>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <span>{alert.title}</span>
                                                {alert.studentName && (
                                                    <span className="text-[11px] bg-black/5 px-2 py-0.5 rounded font-medium text-gray-700">
                                                        {alert.studentName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-gray-700 mt-0.5">{alert.message}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                        {alert.actionUrl && (
                                            <Link
                                                href={alert.actionUrl}
                                                className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-lg font-bold text-xs shadow-2xs transition-colors"
                                            >
                                                متابعة الطالب →
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => handleResolveAlert(alert._id)}
                                            className="px-2.5 py-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold transition-colors"
                                            title="تعليم كمعالج"
                                        >
                                            ✓ تم
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Over Limit Warning */}
            {isOverLimit && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-amber-900 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <h3 className="font-bold text-lg text-amber-900">تنبيه تجاوز حد الطلاب المجانيين</h3>
                            <p className="text-sm text-amber-800 mt-1">
                                العدد الحالي للطلاب المجانيين <strong>({subscriptions.freeSlotsFilled})</strong> يتجاوز الحد الأقصى الجديد المحدد في الإعدادات <strong>({subscriptions.freeLimit})</strong>.
                            </p>
                        </div>
                    </div>
                    <Link href="/admin/free-students?tab=settings" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold shrink-0 hover:bg-amber-700 transition-colors">
                        إعدادات الاشتراك المجاني
                    </Link>
                </div>
            )}

            {/* Row 1: Student Engagement & Activity Metrics */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">مؤشرات متابعة ونشاط الطلاب</h3>
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
                        title="نشاط الطلاب"
                        value={`${students.activeByActivity} نشط`}
                        subValue={`${students.inactiveByActivity} خامل (&gt; 7 أيام)`}
                        icon="⚡"
                        color="green"
                        link="/admin/students?inactive=true"
                    />
                    <StatWidget
                        title="لم يشاهدوا أي فيديو"
                        value={students.noVideoStudents}
                        subValue={`من أصل ${students.total} طالب (${Math.round((students.noVideoStudents / Math.max(1, students.total)) * 100)}%)`}
                        icon="🎬"
                        color="yellow"
                        link="/admin/students?no_video=true"
                    />
                    <StatWidget
                        title="لم يخوضوا أي امتحان"
                        value={students.noExamStudents}
                        subValue={`لم يسجلوا أي محاولة (${Math.round((students.noExamStudents / Math.max(1, students.total)) * 100)}%)`}
                        icon="📝"
                        color="purple"
                        link="/admin/students?no_exam=true"
                    />
                </div>
            </div>

            {/* Row 2: Subscriptions Breakdown Metrics */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">مؤشرات الاشتراكات المجانية والمدفوعة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatWidget
                        title="الاشتراكات المجانية النشطة"
                        value={subscriptions.activeFree}
                        subValue={`${subscriptions.totalFree} إجمالي المستفيدين`}
                        icon="🎁"
                        color="green"
                        link="/admin/free-students?tab=active"
                    />
                    <StatWidget
                        title="مجاني قارب على الانتهاء"
                        value={subscriptions.expiringSoonFree}
                        subValue="أقل من 3 أيام متبقية"
                        icon="⏳"
                        color="yellow"
                        link="/admin/students?expiring_soon=true"
                    />
                    <StatWidget
                        title="اشتراكات مجانية منتهية"
                        value={subscriptions.expiredFree}
                        subValue="تحتاج متابعة للترقية"
                        icon="⌛"
                        color="yellow"
                        link="/admin/free-students?tab=expired"
                    />
                    <StatWidget
                        title="الاشتراكات المدفوعة"
                        value={subscriptions.paid}
                        subValue={`${subscriptions.pendingPayments} طلب دفع معلق`}
                        icon="💳"
                        color="blue"
                        link="/admin/subscriptions/requests"
                    />
                </div>
            </div>

            {/* Row 3: Leaderboards Section (Top Viewers, Top Scorers, Top Points) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Watchers */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>🎬</span> أكثر الطلاب إتمامًا للفيديوهات
                        </h3>
                        <Link href="/admin/students?has_video=true" className="text-xs text-forest font-bold hover:underline">
                            عرض الكل →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {!leaderboards?.topWatchers || leaderboards.topWatchers.length === 0 ? (
                            <p className="text-gray-400 text-center text-xs py-6">لا توجد سجلات مشاهدة مكتملة بعد</p>
                        ) : (
                            leaderboards.topWatchers.map((st: any, idx: number) => (
                                <Link
                                    key={st.studentId}
                                    href={`/admin/students/${st.studentId}`}
                                    className="p-3 bg-gray-50 hover:bg-forest/5 rounded-xl border border-gray-100 flex items-center justify-between transition-colors group block"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="font-bold text-xs text-gray-900 group-hover:text-forest transition-colors">{st.name}</div>
                                            <div className="text-[10px] text-gray-500">{gradeLabel(st.grade)}</div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-black text-xs text-forest">{st.completedCount} حصة</div>
                                        <div className="text-[10px] text-gray-500">{Math.round((st.totalWatchedSeconds || 0) / 60)} دقيقة</div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Exam Scorers */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>📝</span> أوائل الاختبارات والامتحانات
                        </h3>
                        <Link href="/admin/exams" className="text-xs text-forest font-bold hover:underline">
                            عرض الامتحانات →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {!leaderboards?.topScorers || leaderboards.topScorers.length === 0 ? (
                            <p className="text-gray-400 text-center text-xs py-6">لا توجد محاولات اختبار مكتملة بعد</p>
                        ) : (
                            leaderboards.topScorers.map((st: any, idx: number) => (
                                <Link
                                    key={st.studentId}
                                    href={`/admin/students/${st.studentId}`}
                                    className="p-3 bg-gray-50 hover:bg-forest/5 rounded-xl border border-gray-100 flex items-center justify-between transition-colors group block"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="font-bold text-xs text-gray-900 group-hover:text-forest transition-colors">{st.name}</div>
                                            <div className="text-[10px] text-gray-500">{gradeLabel(st.grade)}</div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-black text-xs text-purple-700">{st.avgPercentage}%</div>
                                        <div className="text-[10px] text-gray-500">{st.passedCount} ناجح / {st.totalAttempts} محاولة</div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Points Leaderboard */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>🪙</span> متصدرو النقاط (لوحة الشرف)
                        </h3>
                        <Link href="/admin/gamification" className="text-xs text-forest font-bold hover:underline">
                            إدارة النقاط →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {!leaderboards?.topPoints || leaderboards.topPoints.length === 0 ? (
                            <p className="text-gray-400 text-center text-xs py-6">لا توجد نقاط مسجلة بعد</p>
                        ) : (
                            leaderboards.topPoints.map((st: any, idx: number) => (
                                <Link
                                    key={st._id}
                                    href={`/admin/students/${st._id}`}
                                    className="p-3 bg-gray-50 hover:bg-forest/5 rounded-xl border border-gray-100 flex items-center justify-between transition-colors group block"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            idx === 0 ? 'bg-tawfeek-gold text-amber-950' : idx === 1 ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="font-bold text-xs text-gray-900 group-hover:text-forest transition-colors">{st.name}</div>
                                            <div className="text-[10px] text-gray-500">{gradeLabel(st.grade)}</div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-black text-xs text-tawfeek-gold">{st.points} نقطة</div>
                                        <div className="text-[10px] text-gray-500">المستوى {st.level || 1}</div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions & Links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
                <h2 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2">
                    <span suppressHydrationWarning>⚡</span> الأدوات السريعة للمتابعة وإدارة المحتوى
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        href="/admin/free-students"
                        className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🎁</span>
                        <div>
                            <div className="font-bold text-sm text-emerald-900">إدارة الاشتراكات المجانية</div>
                            <div className="text-xs text-emerald-700">تمديد، إيقاف، والإعدادات</div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/gamification"
                        className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🪙</span>
                        <div>
                            <div className="font-bold text-sm text-amber-900">لوحة النقاط والتحفيز</div>
                            <div className="text-xs text-amber-700">إضافة وخصم وتصفير النقاط</div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/tasks"
                        className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🎯</span>
                        <div>
                            <div className="font-bold text-sm text-blue-900">إدارة المهام التعليمية</div>
                            <div className="text-xs text-blue-700">تعيين واجبات وتحديات للطلاب</div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/student-mistakes"
                        className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-100/60 transition-colors flex items-center gap-3"
                    >
                        <span className="text-2xl" suppressHydrationWarning>🔍</span>
                        <div>
                            <div className="font-bold text-sm text-rose-900">تحليل أخطاء الطلاب</div>
                            <div className="text-xs text-rose-700">الأسئلة الأكثر صعوبة والتعثر</div>
                        </div>
                    </Link>
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
