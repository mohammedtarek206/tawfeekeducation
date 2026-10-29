'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { gradeLabel, ACTIVE_GRADES } from '@/lib/constants/grades';

interface HonorStudent {
    rank: number;
    studentId: string;
    name: string;
    phone: string;
    grade: string;
    avatar: string | null;
    points: number;
    level: number;
    updatedAt?: string;
}

interface HonorBoardSettings {
    enabled: boolean;
    limit: number;
    viewMode: 'all' | 'by_grade';
    showZeroPoints: boolean;
}

interface BoardStats {
    totalApprovedStudents: number;
    studentsWithPointsCount: number;
    totalRankedInView: number;
    topStudentName: string | null;
    highestPoints: number;
    averagePoints: number;
    lastUpdated: string;
}

interface PointTransactionItem {
    _id: string;
    amount: number;
    type: string;
    reason: string;
    balanceAfter: number;
    createdAt: string;
}

function getTransactionTypeLabel(type: string) {
    const labels: Record<string, string> = {
        lesson_completed: 'إكمال حصة',
        quiz_completed: 'اختبار حصة',
        exam_completed: 'امتحان',
        referral: 'مكافأة دعوة صديق',
        reward_redeemed: 'استبدال جائزة',
        admin_adjustment: 'تعديل إداري',
        streak_bonus: 'مداومة مستمرة',
        lesson_watch: 'مشاهدة حصة',
        bonus: 'مكافأة إضافية',
        task_completion: 'إنجاز مهمة',
        achievement: 'وسام إنجاز',
    };
    return labels[type] || type || 'معاملة';
}

export default function AdminHonorBoardPage() {
    // Data State
    const [students, setStudents] = useState<HonorStudent[]>([]);
    const [settings, setSettings] = useState<HonorBoardSettings>({
        enabled: true,
        limit: 20,
        viewMode: 'all',
        showZeroPoints: false,
    });
    const [stats, setStats] = useState<BoardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Filters
    const [selectedGrade, setSelectedGrade] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showZeroInAdmin, setShowZeroInAdmin] = useState<boolean>(true);

    // Settings Form State
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsDraft, setSettingsDraft] = useState<HonorBoardSettings>({
        enabled: true,
        limit: 20,
        viewMode: 'all',
        showZeroPoints: false,
    });
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Modal 1: Adjust Points (Add / Deduct)
    const [adjustStudent, setAdjustStudent] = useState<HonorStudent | null>(null);
    const [adjustAction, setAdjustAction] = useState<'add' | 'deduct'>('add');
    const [adjustAmount, setAdjustAmount] = useState<number | ''>(50);
    const [adjustReason, setAdjustReason] = useState<string>('');
    const [adjustLoading, setAdjustLoading] = useState(false);

    // Modal 2: Reset Single Student Points
    const [resetStudent, setResetStudent] = useState<HonorStudent | null>(null);
    const [resetReason, setResetReason] = useState<string>('');
    const [resetLoading, setResetLoading] = useState(false);

    // Modal 3: Reset All Students Points (Bulk)
    const [bulkResetOpen, setBulkResetOpen] = useState(false);
    const [bulkConfirmation, setBulkConfirmation] = useState('');
    const [bulkReason, setBulkReason] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkStats, setBulkStats] = useState<{ affectedStudentsCount: number; totalPointsToReset: number } | null>(null);

    // Modal 4: Student History
    const [historyStudent, setHistoryStudent] = useState<HonorStudent | null>(null);
    const [historyTransactions, setHistoryTransactions] = useState<PointTransactionItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch Honor Board Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedGrade && selectedGrade !== 'all') params.set('grade', selectedGrade);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            params.set('showZero', showZeroInAdmin ? 'true' : 'false');
            params.set('limit', '100');

            const res = await fetch(`/api/admin/honor-board?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setStudents(json.data.leaderboard || []);
                setSettings(json.data.settings);
                setSettingsDraft(json.data.settings);
                setStats(json.data.stats);
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل جلب بيانات لوحة الشرف' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم أثناء جلب لوحة الشرف' });
        } finally {
            setLoading(false);
        }
    }, [selectedGrade, searchQuery, showZeroInAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Save Settings
    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch('/api/admin/honor-board', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsDraft),
            });
            const json = await res.json();
            if (json.success) {
                setSettings(json.data.settings);
                setNotification({ type: 'success', message: 'تم حفظ إعدادات لوحة الشرف بنجاح وتطبيقها على حسابات الطلاب' });
                setSettingsOpen(false);
                await fetchData();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل حفظ الإعدادات' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم أثناء حفظ الإعدادات' });
        } finally {
            setSavingSettings(false);
        }
    };

    // Handle Adjust Points (Add / Deduct)
    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustStudent) return;

        const amountNum = Number(adjustAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setNotification({ type: 'error', message: 'يرجى إدخال عدد نقاط صحيح أكبر من صفر' });
            return;
        }

        if (!adjustReason.trim() || adjustReason.trim().length < 3) {
            setNotification({ type: 'error', message: 'يرجى كتابة سبب العملية (3 أحرف على الأقل)' });
            return;
        }

        setAdjustLoading(true);
        try {
            if (adjustAction === 'add') {
                const res = await fetch('/api/admin/points', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: adjustStudent.studentId,
                        amount: amountNum,
                        reason: adjustReason.trim(),
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    setNotification({
                        type: 'success',
                        message: `تم إضافة ${amountNum} نقطة للطالب ${adjustStudent.name} بنجاح. رصيده الجديد: ${json.data?.newBalance ?? (adjustStudent.points + amountNum)} نقطة`,
                    });
                    setAdjustStudent(null);
                    setAdjustReason('');
                    await fetchData();
                } else {
                    setNotification({ type: 'error', message: json.message || 'فشلت إضافة النقاط' });
                }
            } else {
                // Deduct
                const res = await fetch('/api/admin/points/deduct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: adjustStudent.studentId,
                        amount: amountNum,
                        reason: adjustReason.trim(),
                        operationType: 'deduction',
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    setNotification({
                        type: 'success',
                        message: `تم خصم ${amountNum} نقطة من الطالب ${adjustStudent.name} بنجاح. رصيده الجديد: ${json.data?.balanceAfter ?? (adjustStudent.points - amountNum)} نقطة`,
                    });
                    setAdjustStudent(null);
                    setAdjustReason('');
                    await fetchData();
                } else {
                    setNotification({ type: 'error', message: json.message || 'فشل خصم النقاط' });
                }
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم أثناء تعديل النقاط' });
        } finally {
            setAdjustLoading(false);
        }
    };

    // Handle Reset Single Student Points
    const handleResetSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetStudent) return;

        if (!resetReason.trim() || resetReason.trim().length < 3) {
            setNotification({ type: 'error', message: 'يرجى كتابة سبب تصفير النقاط (3 أحرف على الأقل)' });
            return;
        }

        setResetLoading(true);
        try {
            const res = await fetch('/api/admin/points/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: resetStudent.studentId,
                    reason: resetReason.trim(),
                    operationType: 'reset',
                }),
            });
            const json = await res.json();
            if (json.success) {
                setNotification({
                    type: 'success',
                    message: `تم تصفير نقاط الطالب ${resetStudent.name} بنجاح وتحديث ترتيبه باللوحة`,
                });
                setResetStudent(null);
                setResetReason('');
                await fetchData();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل تصفير نقاط الطالب' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم أثناء تصفير النقاط' });
        } finally {
            setResetLoading(false);
        }
    };

    // Open Bulk Reset Modal and fetch preview
    const handleOpenBulkReset = async () => {
        setBulkConfirmation('');
        setBulkReason('');
        setBulkOpenModal();
    };

    const setBulkOpenModal = async () => {
        setBulkResetOpen(true);
        try {
            const res = await fetch('/api/admin/points/reset-all');
            const json = await res.json();
            if (json.success) {
                setBulkStats(json.data);
            }
        } catch {
            // fallback
        }
    };

    // Execute Bulk Reset
    const handleBulkResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkConfirmation.trim() !== 'تصفير جميع النقاط') {
            setNotification({ type: 'error', message: 'يرجى كتابة عبارة التأكيد المطلوبة بالضبط: "تصفير جميع النقاط"' });
            return;
        }

        if (!bulkReason.trim() || bulkReason.trim().length < 3) {
            setNotification({ type: 'error', message: 'يرجى كتابة سبب التصفير الشامل (3 أحرف على الأقل)' });
            return;
        }

        setBulkLoading(true);
        try {
            const res = await fetch('/api/admin/points/reset-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confirmationPhrase: bulkConfirmation.trim(),
                    reason: bulkReason.trim(),
                    requestId: `admin_honor_${Date.now()}`,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setNotification({
                    type: 'success',
                    message: json.message || 'تم تصفير نقاط جميع الطلاب بنجاح وتحديث لوحة الشرف فورياً',
                });
                setBulkResetOpen(false);
                await fetchData();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل تنفيذ التصفير الشامل' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم أثناء التصفير الشامل' });
        } finally {
            setBulkLoading(false);
        }
    };

    // View Student Point History
    const handleOpenHistory = async (student: HonorStudent) => {
        setHistoryStudent(student);
        setHistoryTransactions([]);
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/admin/points?studentId=${student.studentId}&limit=50`);
            const json = await res.json();
            if (json.success && json.data?.transactions) {
                setHistoryTransactions(json.data.transactions);
            }
        } catch {
            setNotification({ type: 'error', message: 'فشل تحميل سجل المعاملات للطالب' });
        } finally {
            setHistoryLoading(false);
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <span>🏆</span> لوحة الشرف التلقائية ونظام النقاط
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        ترتيب فوري وتلقائي بنسبة 100% وفق رصيد النقاط الفعلي، مع صلاحيات كاملة للتحكم في الإعدادات والأرصدة وسجلات التدقيق
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                            settingsOpen
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <span>⚙️</span>
                        <span>إعدادات لوحة الشرف</span>
                    </button>

                    <button
                        onClick={handleOpenBulkReset}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <span>⚠️</span>
                        <span>تصفير جميع النقاط</span>
                    </button>

                    <Link
                        href="/student/leaderboard"
                        target="_blank"
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <span>👁️</span>
                        <span>معاينة كما يراها الطالب</span>
                    </Link>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-4 py-2.5 bg-forest hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
                    >
                        <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
                        <span>تحديث فوري</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div
                    className={`rounded-2xl p-4 text-sm font-bold flex items-center justify-between shadow-sm animate-fadeIn ${
                        notification.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span>{notification.type === 'success' ? '✅' : '❌'}</span>
                        <span>{notification.message}</span>
                    </div>
                    <button
                        onClick={() => setNotification(null)}
                        className="text-gray-400 hover:text-gray-600 text-base"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="text-3xl mb-1">👥</div>
                    <div className="text-2xl font-black text-gray-900">
                        {stats ? stats.totalApprovedStudents.toLocaleString() : '—'}
                    </div>
                    <div className="text-xs font-bold text-gray-500 mt-1">طالب مسجل ومعتمد بالمنصة</div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="text-3xl mb-1">🪙</div>
                    <div className="text-2xl font-black text-forest">
                        {stats ? stats.studentsWithPointsCount.toLocaleString() : '—'}
                    </div>
                    <div className="text-xs font-bold text-gray-500 mt-1">طالب يملك نقاطاً نشطة (&gt; 0)</div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 shadow-sm p-5">
                    <div className="text-3xl mb-1">👑</div>
                    <div className="text-lg font-black text-amber-900 truncate">
                        {stats?.topStudentName || 'لا يوجد'}
                    </div>
                    <div className="text-xs font-bold text-amber-700 mt-1">
                        صاحب المركز الأول ({stats ? stats.highestPoints.toLocaleString() : 0} نقطة)
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="text-3xl mb-1">🎯</div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-3 h-3 rounded-full ${
                                settings.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                        />
                        <span className="text-lg font-black text-gray-900">
                            {settings.enabled ? 'مفعّلة للطلاب' : 'معطلة مؤقتًا'}
                        </span>
                    </div>
                    <div className="text-xs font-bold text-gray-500 mt-1">
                        الحد المعروض: {settings.limit} طالب • {settings.viewMode === 'by_grade' ? 'حسب الصف' : 'لوحة عامة'}
                    </div>
                </div>
            </div>

            {/* Settings Card (Collapsible) */}
            {settingsOpen && (
                <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-md p-6 space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <span>⚙️</span> إعدادات لوحة الشرف وصلاحيات العرض
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                تحكم في ظهور اللوحة للطلاب، وعدد المراكز المعروضة، ونمط العرض، والتعامل مع الأرصدة الصفرية
                            </p>
                        </div>
                        <button
                            onClick={() => setSettingsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                        >
                            إغلاق ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* 1. Enable / Disable */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
                            <label className="block text-xs font-bold text-gray-800">
                                حالة لوحة الشرف للطلاب
                            </label>
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSettingsDraft({ ...settingsDraft, enabled: true })}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                        settingsDraft.enabled
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                                >
                                    ✓ مفعّلة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettingsDraft({ ...settingsDraft, enabled: false })}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                        !settingsDraft.enabled
                                            ? 'bg-rose-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                                >
                                    ✕ معطلة
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400">
                                عند التعطيل، تظهر للطلاب رسالة بأن اللوحة متوقفة مؤقتاً
                            </p>
                        </div>

                        {/* 2. Students Limit */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
                            <label className="block text-xs font-bold text-gray-800">
                                عدد الطلاب المعروضين للطلاب
                            </label>
                            <select
                                value={settingsDraft.limit}
                                onChange={(e) =>
                                    setSettingsDraft({ ...settingsDraft, limit: Number(e.target.value) || 20 })
                                }
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-forest/30"
                            >
                                <option value={10}>أفضل 10 طلاب</option>
                                <option value={20}>أفضل 20 طالب</option>
                                <option value={50}>أفضل 50 طالب</option>
                                <option value={100}>أفضل 100 طالب</option>
                            </select>
                            <p className="text-[11px] text-gray-400">
                                عدد المراكز التي تظهر في حساب الطالب
                            </p>
                        </div>

                        {/* 3. View Mode */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
                            <label className="block text-xs font-bold text-gray-800">
                                نمط العرض الأساسي
                            </label>
                            <select
                                value={settingsDraft.viewMode}
                                onChange={(e) =>
                                    setSettingsDraft({
                                        ...settingsDraft,
                                        viewMode: e.target.value as 'all' | 'by_grade',
                                    })
                                }
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-forest/30"
                            >
                                <option value="all">لوحة عامة لجميع الصفوف</option>
                                <option value="by_grade">لوحة مخصصة لكل صف دراسي</option>
                            </select>
                            <p className="text-[11px] text-gray-400">
                                التبديل بين اللوحة العامة والتقسيم الصفي
                            </p>
                        </div>

                        {/* 4. Show Zero Points */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
                            <label className="block text-xs font-bold text-gray-800">
                                إظهار الطلاب برصيد صفر نقطة
                            </label>
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSettingsDraft({ ...settingsDraft, showZeroPoints: true })}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                        settingsDraft.showZeroPoints
                                            ? 'bg-forest text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                                >
                                    نعم
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettingsDraft({ ...settingsDraft, showZeroPoints: false })}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                        !settingsDraft.showZeroPoints
                                            ? 'bg-forest text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                                >
                                    إخفاء (فقط &gt; 0)
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400">
                                افتراضياً يتم إخفاء من لم يكتسب أي نقاط بعد
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSettingsDraft(settings);
                                setSettingsOpen(false);
                            }}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="px-6 py-2.5 bg-forest hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {savingSettings ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    <span>حفظ وتطبيق الإعدادات</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[220px]">
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو رقم الهاتف..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Grade Selector */}
                    <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                    >
                        <option value="all">🌐 جميع الصفوف الدراسية</option>
                        {ACTIVE_GRADES.map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>

                    {/* Toggle Zero Points in Admin view */}
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                        <input
                            type="checkbox"
                            checked={showZeroInAdmin}
                            onChange={(e) => setShowZeroInAdmin(e.target.checked)}
                            className="rounded text-forest focus:ring-forest"
                        />
                        <span>عرض طلاب (0 نقطة) بالمعاينة</span>
                    </label>
                </div>

                <div className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                    المعروض: {students.length} طالب
                </div>
            </div>

            {/* Information Notice */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">ℹ️</span>
                    <span>
                        <strong>الترتيب أوتوماتيكي بالكامل:</strong> يتم ترتيب الطلاب تنازلياً حسب مجموع النقاط الفعلي. أي عملية إضافة أو خصم أو تصفير تنعكس لحظياً على الترتيب دون حاجة لأي تدخل يدوي لتحديد المراكز.
                    </span>
                </div>
                {stats?.lastUpdated && (
                    <span className="text-[11px] text-emerald-700 shrink-0">
                        آخر تحديث: {new Date(stats.lastUpdated).toLocaleTimeString('ar-EG')}
                    </span>
                )}
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
                            <span>📋</span> قائمة لوحة الشرف التلقائية
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            الطلاب معروضون بالترتيب الفعلي وفق رصيد النقاط الحالي
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-gray-400 text-sm font-medium">جاري تحميل القائمة المحدثة...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="py-16 text-center p-6 space-y-3">
                        <div className="text-5xl mb-2">🏆</div>
                        <h3 className="text-base font-bold text-gray-800">لا يوجد طلاب متوافقون مع شروط البحث</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            جرب تغيير فلتر الصف الدراسي أو تفعيل خيار عرض الطلاب الذين يملكون صفر نقطة
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold">
                                    <th className="px-5 py-3.5 text-right w-24">المركز</th>
                                    <th className="px-5 py-3.5 text-right">الطالب</th>
                                    <th className="px-5 py-3.5 text-right">الهاتف</th>
                                    <th className="px-5 py-3.5 text-right">الصف</th>
                                    <th className="px-5 py-3.5 text-center">المستوى</th>
                                    <th className="px-5 py-3.5 text-center">النقاط الفعلية</th>
                                    <th className="px-5 py-3.5 text-center w-56">إدارة النقاط والملف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((item) => {
                                    const isTop3 = item.rank <= 3;

                                    return (
                                        <tr
                                            key={item.studentId}
                                            className={`hover:bg-gray-50/70 transition-colors ${
                                                isTop3 ? 'bg-amber-50/20' : ''
                                            }`}
                                        >
                                            {/* Rank */}
                                            <td className="px-5 py-4 font-black">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-lg">
                                                        {item.rank === 1
                                                            ? '🥇'
                                                            : item.rank === 2
                                                            ? '🥈'
                                                            : item.rank === 3
                                                            ? '🥉'
                                                            : '⭐'}
                                                    </span>
                                                    <span
                                                        className={`font-black ${
                                                            item.rank === 1
                                                                ? 'text-amber-600'
                                                                : item.rank === 2
                                                                ? 'text-slate-600'
                                                                : item.rank === 3
                                                                ? 'text-orange-600'
                                                                : 'text-gray-700'
                                                        }`}
                                                    >
                                                        #{item.rank}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Student Name */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    {item.avatar ? (
                                                        <img
                                                            src={item.avatar}
                                                            alt={item.name}
                                                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-forest text-white text-xs font-black flex items-center justify-center">
                                                            {item.name.trim()[0] || 'ط'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-gray-900">{item.name}</div>
                                                        <div className="text-[10px] text-gray-400">
                                                            ID: {item.studentId.slice(-6)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-5 py-4 text-xs font-mono text-gray-600 dir-ltr text-right">
                                                {item.phone || '—'}
                                            </td>

                                            {/* Grade */}
                                            <td className="px-5 py-4 text-xs text-gray-600">
                                                <span className="bg-gray-100 px-2 py-1 rounded-lg">
                                                    {gradeLabel(item.grade) || '—'}
                                                </span>
                                            </td>

                                            {/* Level */}
                                            <td className="px-5 py-4 text-center">
                                                <span className="bg-forest/10 text-forest text-xs font-bold px-2.5 py-1 rounded-md">
                                                    المستوى {item.level}
                                                </span>
                                            </td>

                                            {/* Current Points */}
                                            <td className="px-5 py-4 text-center">
                                                <span className="font-black text-forest text-base">
                                                    {item.points.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-gray-400 mr-1">نقطة</span>
                                            </td>

                                            {/* Quick Actions */}
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {/* History */}
                                                    <button
                                                        onClick={() => handleOpenHistory(item)}
                                                        title="عرض سجل حركات النقاط"
                                                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <span>📜</span>
                                                        <span>السجل</span>
                                                    </button>

                                                    {/* Adjust Points */}
                                                    <button
                                                        onClick={() => {
                                                            setAdjustStudent(item);
                                                            setAdjustAction('add');
                                                            setAdjustAmount(50);
                                                            setAdjustReason('');
                                                        }}
                                                        title="إضافة أو خصم نقاط"
                                                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <span>➕/➖</span>
                                                        <span>تعديل</span>
                                                    </button>

                                                    {/* Reset Single Student */}
                                                    <button
                                                        onClick={() => {
                                                            setResetStudent(item);
                                                            setResetReason('');
                                                        }}
                                                        disabled={item.points <= 0}
                                                        title={item.points <= 0 ? 'رصيد الطالب صفر بالفعل' : 'تصفير نقاط الطالب'}
                                                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-30 disabled:hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <span>🔄</span>
                                                        <span>تصفير</span>
                                                    </button>

                                                    {/* Student Profile */}
                                                    <Link
                                                        href={`/admin/students?search=${encodeURIComponent(item.phone || item.name)}`}
                                                        target="_blank"
                                                        title="فتح ملف الطالب في إدارة الطلاب"
                                                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <span>👤</span>
                                                        <span>الملف</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal 1: Adjust Points (Add / Deduct) */}
            {adjustStudent && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                                <span>🪙</span> تعديل نقاط الطالب
                            </h3>
                            <button
                                onClick={() => setAdjustStudent(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-3.5 space-y-1 text-xs">
                            <div className="font-bold text-gray-900 text-sm">{adjustStudent.name}</div>
                            <div className="text-gray-500">
                                الرصيد الحالي: <strong className="text-forest text-sm font-black">{adjustStudent.points}</strong> نقطة • {gradeLabel(adjustStudent.grade)}
                            </div>
                        </div>

                        <form onSubmit={handleAdjustSubmit} className="space-y-4">
                            {/* Action toggle */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    نوع التعديل
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustAction('add')}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                            adjustAction === 'add'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        ➕ إضافة نقاط (مكافأة)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustAction('deduct')}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                            adjustAction === 'deduct'
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        ➖ خصم نقاط
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    عدد النقاط <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={adjustAction === 'deduct' ? adjustStudent.points : 10000}
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                                    required
                                />
                                {adjustAction === 'deduct' && (
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        أقصى حد للخصم هو رصيد الطالب الحالي ({adjustStudent.points} نقطة)
                                    </p>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    السبب (يُسجل في سجل الطالب والتدقيق) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="مثال: مكافأة تفوق في الاختبار، تصحيح رصيد..."
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    maxLength={120}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAdjustStudent(null)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustLoading || !adjustAmount || !adjustReason.trim()}
                                    className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                                        adjustAction === 'add' ? 'bg-forest hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                                >
                                    {adjustLoading ? (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>تأكيد العملية</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Reset Single Student Points */}
            {resetStudent && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
                            ⚠️
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg font-black text-gray-900">
                                تصفير نقاط الطالب
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                هل أنت متأكد من تصفير رصيد الطالب{' '}
                                <strong className="text-gray-900">{resetStudent.name}</strong>؟
                            </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-semibold leading-relaxed">
                            💡 <strong>ملاحظة أمان:</strong> سيتم تصفير الرصيد من <strong>{resetStudent.points} نقطة</strong> إلى <strong>0 نقطة</strong>، وسيتم حفظ معاملة الخصم والتسجيل التاريخي في الـ Ledger دون حذف أي سجلات سابقة.
                        </div>

                        <form onSubmit={handleResetSingleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    سبب التصفير <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="مثال: بدء موسم دراسي جديد، تصحيح..."
                                    value={resetReason}
                                    onChange={(e) => setResetReason(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setResetStudent(null)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetLoading || !resetReason.trim()}
                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    {resetLoading ? (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>تأكيد تصفير الرصيد</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: Bulk Reset All Students */}
            {bulkResetOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                            🚨
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl font-black text-gray-900">
                                تصفير نقاط جميع الطلاب
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                هذا الإجراء سيقوم بتصفير نقاط كافة الطلاب في المنصة الذين يملكون رصيداً موجباً
                            </p>
                        </div>

                        {bulkStats && (
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                                    <div className="text-xl font-black text-gray-900">
                                        {bulkStats.affectedStudentsCount.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-gray-500 font-bold">طالب سيتأثر</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded-2xl border border-red-200">
                                    <div className="text-xl font-black text-red-700">
                                        {bulkStats.totalPointsToReset.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-red-600 font-bold">إجمالي النقاط المصفّرة</div>
                                </div>
                            </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 font-semibold leading-relaxed">
                            🛡️ <strong>التدقيق التاريخي:</strong> لن يتم حذف أي معاملات سابقة؛ سيتم تسجيل عملية خصم معتمدة لكل طالب في سجل الـ Ledger لتوضيح أن الرصيد أصبح 0 بقرار الأدمن.
                        </div>

                        <form onSubmit={handleBulkResetSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    سبب التصفير الشامل <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="مثال: انتهاء الفصل الدراسي الأول وبدء دورة جديدة..."
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    لتأكيد العملية، اكتب بالضبط: <strong className="text-red-600 select-all">تصفير جميع النقاط</strong>
                                </label>
                                <input
                                    type="text"
                                    placeholder="تصفير جميع النقاط"
                                    value={bulkConfirmation}
                                    onChange={(e) => setBulkConfirmation(e.target.value)}
                                    className="w-full border-2 border-red-200 rounded-xl px-4 py-2.5 text-xs text-center font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setBulkResetOpen(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        bulkLoading ||
                                        bulkConfirmation.trim() !== 'تصفير جميع النقاط' ||
                                        !bulkReason.trim()
                                    }
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    {bulkLoading ? (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>تأكيد التصفير الشامل 🚨</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 4: Student History Drawer / Modal */}
            {historyStudent && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                                    <span>📜</span> سجل حركات نقاط الطالب
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {historyStudent.name} • الهاتف: {historyStudent.phone} • الرصيد: {historyStudent.points} نقطة
                                </p>
                            </div>
                            <button
                                onClick={() => setHistoryStudent(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {historyLoading ? (
                                <div className="py-16 text-center">
                                    <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">جاري تحميل سجل المعاملات...</p>
                                </div>
                            ) : historyTransactions.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 text-xs">
                                    لا توجد حركات نقاط مسجلة لهذا الطالب حتى الآن
                                </div>
                            ) : (
                                historyTransactions.map((tx) => {
                                    const isPositive = tx.amount > 0;
                                    return (
                                        <div
                                            key={tx._id}
                                            className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 text-xs hover:border-gray-200 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                                        isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                    }`}
                                                >
                                                    {isPositive ? '＋' : '－'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{tx.reason}</div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5">
                                                        النوع: {getTransactionTypeLabel(tx.type)} • {new Date(tx.createdAt).toLocaleDateString('ar-EG', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-left shrink-0">
                                                <div
                                                    className={`font-black text-sm ${
                                                        isPositive ? 'text-emerald-700' : 'text-rose-700'
                                                    }`}
                                                >
                                                    {isPositive ? `+${tx.amount}` : tx.amount} نقطة
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    الرصيد بعدها: {tx.balanceAfter}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="border-t border-gray-100 pt-3 flex justify-end">
                            <button
                                onClick={() => setHistoryStudent(null)}
                                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
