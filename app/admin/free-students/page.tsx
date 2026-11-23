'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gradeLabel, ACTIVE_GRADES } from '@/lib/constants/grades';
import { formatDate } from '@/lib/utils/helpers';

export default function AdminFreeStudentsPage() {
    const [mainTab, setMainTab] = useState<'students' | 'settings'>('students');

    // Students state
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all'); // all | active | expired | upcoming | paused
    const [page, setPage] = useState(1);

    // Modal state for student action (extend / shorten / pause / activate)
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [actionType, setActionType] = useState<'extend' | 'shorten' | 'pause' | 'activate'>('extend');
    const [actionAmount, setActionAmount] = useState('7');
    const [actionUnit, setActionUnit] = useState<'days' | 'hours'>('days');
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Settings state
    const [settingsData, setSettingsData] = useState<any>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form inputs for settings
    const [formEnabled, setFormEnabled] = useState(true);
    const [formLimit, setFormLimit] = useState(100);
    const [formDuration, setFormDuration] = useState(30);
    const [formDurationUnit, setFormDurationUnit] = useState<'days' | 'hours'>('days');
    const [formGrades, setFormGrades] = useState<string[]>([]);
    const [formGrantMode, setFormGrantMode] = useState<'auto_register' | 'admin_approval'>('admin_approval');
    const [formAudience, setFormAudience] = useState<'all' | 'specific_grades' | 'new_registered'>('all');
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');

    const fetchFreeStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('q', search);
            if (selectedGrade) params.append('grade', selectedGrade);
            if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
            params.append('page', String(page));
            params.append('limit', '25');

            const res = await fetch(`/api/admin/free-students?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        setSettingsLoading(true);
        try {
            const res = await fetch('/api/admin/free-students/settings');
            const json = await res.json();
            if (json.success && json.data?.settings) {
                const s = json.data.settings;
                setSettingsData(s);
                setFormEnabled(s.freeOfferEnabled ?? true);
                setFormLimit(s.freeStudentsLimit ?? 100);
                setFormDuration(s.freeOfferDuration ?? 30);
                setFormDurationUnit(s.freeOfferDurationUnit ?? 'days');
                setFormGrades(s.freeOfferEligibleGrades ?? []);
                setFormGrantMode(s.freeOfferGrantMode ?? 'admin_approval');
                setFormAudience(s.freeOfferAudience ?? 'all');
                setFormTitle(s.freeOfferTitle ?? '');
                setFormDesc(s.freeOfferDescription ?? '');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        if (mainTab === 'students') {
            fetchFreeStudents();
        } else {
            fetchSettings();
        }
    }, [mainTab, selectedGrade, selectedStatus, page]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchFreeStudents();
    };

    const handleOpenActionModal = (student: any, type: 'extend' | 'shorten' | 'pause' | 'activate') => {
        setSelectedStudent(student);
        setActionType(type);
        setActionAmount(type === 'extend' || type === 'shorten' ? '7' : '1');
        setActionUnit('days');
        setActionReason('');
        setActionMsg(null);
    };

    const handleExecuteAction = async () => {
        if (!selectedStudent) return;
        if (!actionReason || actionReason.trim().length < 3) {
            setActionMsg({ type: 'error', text: 'يرجى كتابة سبب الإجراء (3 أحرف على الأقل)' });
            return;
        }

        setActionLoading(true);
        setActionMsg(null);

        try {
            const res = await fetch('/api/admin/free-students', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudent._id,
                    action: actionType,
                    amount: parseInt(actionAmount, 10),
                    unit: actionUnit,
                    reason: actionReason.trim(),
                }),
            });

            const json = await res.json();
            if (json.success) {
                setActionMsg({ type: 'success', text: json.message });
                setTimeout(() => {
                    setSelectedStudent(null);
                    fetchFreeStudents();
                }, 1200);
            } else {
                setActionMsg({ type: 'error', text: json.message || 'حدث خطأ أثناء تنفيذ الإجراء' });
            }
        } catch {
            setActionMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSettingsSaving(true);
        setSettingsMsg(null);

        try {
            const res = await fetch('/api/admin/free-students/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    freeOfferEnabled: formEnabled,
                    freeStudentsLimit: formLimit,
                    freeOfferDuration: formDuration,
                    freeOfferDurationUnit: formDurationUnit,
                    freeOfferEligibleGrades: formGrades,
                    freeOfferGrantMode: formGrantMode,
                    freeOfferAudience: formAudience,
                    freeOfferTitle: formTitle,
                    freeOfferDescription: formDesc,
                }),
            });

            const json = await res.json();
            if (json.success) {
                setSettingsMsg({ type: 'success', text: 'تم حفظ إعدادات الاشتراك المجاني بنجاح' });
                fetchSettings();
            } else {
                setSettingsMsg({ type: 'error', text: json.message || 'فشل حفظ الإعدادات' });
            }
        } catch {
            setSettingsMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم أثناء حفظ الإعدادات' });
        } finally {
            setSettingsSaving(false);
        }
    };

    const toggleGrade = (gradeVal: string) => {
        if (formGrades.includes(gradeVal)) {
            setFormGrades(formGrades.filter((g) => g !== gradeVal));
        } else {
            setFormGrades([...formGrades, gradeVal]);
        }
    };

    const stats = data?.stats || { freeStudentsCount: 0, freeStudentsLimit: 100, remainingSlots: 100, usagePercentage: 0 };
    const counts = data?.counts || { total: 0, active: 0, expired: 0, upcoming: 0, paused: 0 };
    const students = data?.students || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">نظام إدارة الاشتراكات المجانية</h1>
                    <p className="text-gray-500 text-sm mt-1">التحكم الكامل في مدة وصلاحيات وشروط الاشتراكات المجانية للطلاب</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setMainTab('students')}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                            mainTab === 'students' ? 'bg-forest text-white shadow-md' : 'bg-white text-gray-700 border hover:bg-gray-50'
                        }`}
                    >
                        <span>👥</span>
                        <span>إدارة الاشتراكات</span>
                    </button>
                    <button
                        onClick={() => setMainTab('settings')}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                            mainTab === 'settings' ? 'bg-forest text-white shadow-md' : 'bg-white text-gray-700 border hover:bg-gray-50'
                        }`}
                    >
                        <span>⚙️</span>
                        <span>إعدادات الاشتراك المجاني</span>
                    </button>
                </div>
            </div>

            {/* Main Tab 1: Students Management */}
            {mainTab === 'students' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Summary Statistics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 mb-1">الاشتراكات النشطة</div>
                            <div className="text-3xl font-black text-emerald-600">{counts.active}</div>
                            <div className="text-xs text-gray-400 mt-1">طالب نشط حالياً</div>
                        </div>
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 mb-1">الاشتراكات المنتهية</div>
                            <div className="text-3xl font-black text-rose-600">{counts.expired}</div>
                            <div className="text-xs text-gray-400 mt-1">انتهت صلاحية وصولهم</div>
                        </div>
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 mb-1">إجمالي المستفيدين</div>
                            <div className="text-3xl font-black text-forest">
                                {counts.total} <span className="text-sm text-gray-400 font-normal">/ {stats.freeStudentsLimit}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">متبقي {stats.remainingSlots} مقعد</div>
                        </div>
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 mb-1">الموقوفة / قيد الانتظار</div>
                            <div className="text-3xl font-black text-amber-600">{counts.paused + counts.upcoming}</div>
                            <div className="text-xs text-gray-400 mt-1">{counts.paused} موقوف | {counts.upcoming} لم يبدأ</div>
                        </div>
                    </div>

                    {/* Status Tabs and Search */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        {/* Status Filters */}
                        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
                            {[
                                { key: 'all', label: `الكل (${counts.total})` },
                                { key: 'active', label: `🟢 النشطة (${counts.active})` },
                                { key: 'expired', label: `🔴 المنتهية (${counts.expired})` },
                                { key: 'upcoming', label: `🔵 لم تبدأ بعد (${counts.upcoming})` },
                                { key: 'paused', label: `⏸️ الموقوفة (${counts.paused})` },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setSelectedStatus(tab.key);
                                        setPage(1);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                        selectedStatus === tab.key
                                            ? 'bg-forest text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search and Grade filters */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto flex-1">
                                <input
                                    type="text"
                                    placeholder="ابحث باسم الطالب أو رقم الهاتف..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="input-field max-w-md text-sm"
                                />
                                <button type="submit" className="btn-primary text-sm px-6 shrink-0">
                                    بحث
                                </button>
                            </form>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <label className="text-xs font-bold text-gray-600 shrink-0">تصفية حسب الصف:</label>
                                <select
                                    value={selectedGrade}
                                    onChange={(e) => {
                                        setSelectedGrade(e.target.value);
                                        setPage(1);
                                    }}
                                    className="input-field text-sm font-bold bg-white"
                                >
                                    <option value="">جميع الصفوف الدراسية</option>
                                    {ACTIVE_GRADES.map((g: any) => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Students Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-offwhite/50 flex justify-between items-center">
                            <div className="font-bold text-gray-800 text-sm">
                                {loading ? 'جاري التحميل...' : `عرض ${students.length} اشتراك مجاني`}
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-gray-400 font-bold animate-pulse">
                                جاري تحميل الاشتراكات...
                            </div>
                        ) : students.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 font-bold">
                                لا يوجد طلاب يطابقون خيارات البحث أو التصفية الحالية.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                        <tr>
                                            <th className="p-4"># المقعد</th>
                                            <th className="p-4">اسم الطالب</th>
                                            <th className="p-4">رقم الهاتف</th>
                                            <th className="p-4">الصف الدراسي</th>
                                            <th className="p-4">تاريخ البداية</th>
                                            <th className="p-4">تاريخ الانتهاء</th>
                                            <th className="p-4">الحالة الفعلية</th>
                                            <th className="p-4 text-center">إجراءات الاشتراك</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {students.map((st: any) => (
                                            <tr key={st._id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-4 font-black font-mono text-tawfeek-green">
                                                    #{st.freeSlotNumber || '-'}
                                                </td>
                                                <td className="p-4">
                                                    <Link
                                                        href={`/admin/students/${st._id}`}
                                                        className="font-bold text-gray-900 hover:text-forest transition-colors"
                                                    >
                                                        {st.name}
                                                    </Link>
                                                </td>
                                                <td className="p-4 font-mono dir-ltr text-right text-gray-600">{st.phone}</td>
                                                <td className="p-4">
                                                    <span className="bg-gray-100 text-gray-700 font-bold px-2.5 py-1 rounded-full text-xs">
                                                        {gradeLabel(st.grade)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-600 text-xs font-mono">
                                                    {st.subscriptionStartDate ? formatDate(st.subscriptionStartDate) : '—'}
                                                </td>
                                                <td className="p-4 text-gray-600 text-xs font-mono">
                                                    {st.subscriptionEndDate ? formatDate(st.subscriptionEndDate) : '—'}
                                                </td>
                                                <td className="p-4">
                                                    {st.liveStatus === 'active' && (
                                                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                                                            🟢 نشط ومفعّل
                                                        </span>
                                                    )}
                                                    {st.liveStatus === 'expired' && (
                                                        <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full">
                                                            🔴 منتهي الصلاحية
                                                        </span>
                                                    )}
                                                    {st.liveStatus === 'upcoming' && (
                                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                                            🔵 لم يبدأ بعد
                                                        </span>
                                                    )}
                                                    {st.liveStatus === 'paused' && (
                                                        <span className="bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1 rounded-full">
                                                            ⏸️ موقوف مؤقتاً
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        <button
                                                            onClick={() => handleOpenActionModal(st, 'extend')}
                                                            title="تمديد مدة الاشتراك"
                                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                                                        >
                                                            ⏱️ تمديد
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenActionModal(st, 'shorten')}
                                                            title="تقصير مدة الاشتراك"
                                                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 transition-colors"
                                                        >
                                                            ✂️ تقصير
                                                        </button>
                                                        {st.liveStatus === 'paused' ? (
                                                            <button
                                                                onClick={() => handleOpenActionModal(st, 'activate')}
                                                                title="إعادة تفعيل الاشتراك"
                                                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
                                                            >
                                                                ▶️ تفعيل
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleOpenActionModal(st, 'pause')}
                                                                title="إيقاف الاشتراك مؤقتاً"
                                                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg border border-gray-300 transition-colors"
                                                            >
                                                                ⏸️ إيقاف
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={`/admin/students/${st._id}`}
                                                            title="عرض ملف ومتابعة الطالب"
                                                            className="px-2.5 py-1 bg-forest/10 hover:bg-forest/20 text-forest text-xs font-bold rounded-lg transition-colors"
                                                        >
                                                            👤 الملف
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {data?.pages > 1 && (
                            <div className="p-4 border-t flex justify-between items-center text-xs font-bold text-gray-600 bg-gray-50">
                                <div>صفحة {page} من {data.pages}</div>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage(page - 1)}
                                        className="px-3 py-1.5 bg-white border rounded-lg disabled:opacity-40"
                                    >
                                        السابق
                                    </button>
                                    <button
                                        disabled={page >= data.pages}
                                        onClick={() => setPage(page + 1)}
                                        className="px-3 py-1.5 bg-white border rounded-lg disabled:opacity-40"
                                    >
                                        التالي
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Tab 2: Free Subscription Settings */}
            {mainTab === 'settings' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-8 animate-fadeIn max-w-4xl">
                    <div className="border-b border-gray-100 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span>⚙️</span>
                            <span>إعدادات الاشتراك المجاني الشاملة</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            تحديد شروط ومدد وفئات الاشتراكات المجانية. التعديل في المدة ينطبق على الاشتراكات المستقبلية دون التأثير بأثر رجعي على الاشتراكات الممنوحة مسبقاً.
                        </p>
                    </div>

                    {settingsMsg && (
                        <div
                            className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                                settingsMsg.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-red-800 border border-red-200'
                            }`}
                        >
                            <span>{settingsMsg.type === 'success' ? '✅' : '❌'}</span>
                            <span>{settingsMsg.text}</span>
                        </div>
                    )}

                    {settingsLoading ? (
                        <div className="p-12 text-center text-gray-400 font-bold animate-pulse">
                            جاري تحميل الإعدادات...
                        </div>
                    ) : (
                        <form onSubmit={handleSaveSettings} className="space-y-6">
                            {/* Toggle Enable */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">حالة العرض والاشتراك المجاني</div>
                                    <div className="text-xs text-gray-500 mt-0.5">تفعيل أو إيقاف استقبال مشتركين مجانيين بالمنصة</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formEnabled}
                                        onChange={(e) => setFormEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                                </label>
                            </div>

                            {/* Duration and Unit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        مدة الاشتراك المجاني <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formDuration}
                                        onChange={(e) => setFormDuration(Math.max(1, parseInt(e.target.value || '1', 10)))}
                                        className="input-field w-full text-sm font-bold"
                                        required
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">المدة التي تمنح للطالب فور تفعيل اشتراكه المجاني</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        وحدة المدة <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formDurationUnit}
                                        onChange={(e) => setFormDurationUnit(e.target.value as 'days' | 'hours')}
                                        className="input-field w-full text-sm font-bold bg-white"
                                    >
                                        <option value="days">أيام (Days)</option>
                                        <option value="hours">ساعات (Hours)</option>
                                    </select>
                                    <p className="text-[11px] text-gray-400 mt-1">تحديد ما إذا كانت المدة بالأيام أو بالساعات</p>
                                </div>
                            </div>

                            {/* Limits and Audience */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        الحد الأقصى لعدد الطلاب المجانيين <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formLimit}
                                        onChange={(e) => setFormLimit(Math.max(1, parseInt(e.target.value || '1', 10)))}
                                        className="input-field w-full text-sm font-bold"
                                        required
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">إجمالي المقاعد المجانية المسموح بها في المنصة</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        طريقة منح الاشتراك المجاني <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formGrantMode}
                                        onChange={(e) => setFormGrantMode(e.target.value as 'auto_register' | 'admin_approval')}
                                        className="input-field w-full text-sm font-bold bg-white"
                                    >
                                        <option value="admin_approval">بعد موافقة الأدمن على الطالب</option>
                                        <option value="auto_register">تلقائيًا ومباشرة عند التسجيل</option>
                                    </select>
                                    <p className="text-[11px] text-gray-400 mt-1">هل يُمنح فور إنشاء الحساب أم يتطلب مراجعة وقبول الأدمن</p>
                                </div>
                            </div>

                            {/* Audience */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    الفئة المستهدفة من الاشتراك المجاني <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formAudience}
                                    onChange={(e) => setFormAudience(e.target.value as any)}
                                    className="input-field w-full text-sm font-bold bg-white"
                                >
                                    <option value="all">متاح لجميع الطلاب (كافة الصفوف والفئات)</option>
                                    <option value="specific_grades">صفوف دراسية محددة فقط</option>
                                    <option value="new_registered">الطلاب الجدد فقط عند التسجيل</option>
                                </select>
                            </div>

                            {/* Eligible Grades Checkboxes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    الصفوف الدراسية المشمولة بالاشتراك المجاني (اترك الكل فارغاً لإتاحته لجميع الصفوف):
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                                    {ACTIVE_GRADES.map((g: any) => {
                                        const checked = formGrades.includes(g.value);
                                        return (
                                            <label
                                                key={g.value}
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                                                    checked
                                                        ? 'bg-forest/10 border-forest text-forest'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleGrade(g.value)}
                                                    className="rounded text-forest focus:ring-forest"
                                                />
                                                <span>{g.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Title & Description */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">عنوان العرض الترويجي للطلاب</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="input-field w-full text-sm"
                                        placeholder="مثال: اشتراك مجاني كامل لأول 100 طالب"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">وصف العرض والمميزات</label>
                                    <textarea
                                        rows={3}
                                        value={formDesc}
                                        onChange={(e) => setFormDesc(e.target.value)}
                                        className="input-field w-full text-sm resize-none"
                                        placeholder="تفاصيل ما يشمله الاشتراك المجاني..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={settingsSaving}
                                    className="btn-primary text-sm px-8 py-3 disabled:opacity-50"
                                >
                                    {settingsSaving ? 'جاري الحفظ...' : '💾 حفظ وتطبيق الإعدادات'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Action Modal (Extend / Shorten / Pause / Activate) */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <span>{actionType === 'extend' ? '⏱️' : actionType === 'shorten' ? '✂️' : actionType === 'pause' ? '⏸️' : '▶️'}</span>
                                <span>
                                    {actionType === 'extend' && 'تمديد مدة الاشتراك المجاني'}
                                    {actionType === 'shorten' && 'تقصير مدة الاشتراك المجاني'}
                                    {actionType === 'pause' && 'إيقاف الاشتراك المجاني'}
                                    {actionType === 'activate' && 'إعادة تفعيل الاشتراك المجاني'}
                                </span>
                            </h3>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {actionMsg && (
                            <div
                                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                    actionMsg.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-red-800 border border-red-200'
                                }`}
                            >
                                <span>{actionMsg.type === 'success' ? '✅' : '❌'}</span>
                                <span>{actionMsg.text}</span>
                            </div>
                        )}

                        <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">الطالب:</span>
                                <span className="font-black text-gray-900">{selectedStudent.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">تاريخ الانتهاء الحالي:</span>
                                <span className="font-mono text-gray-700">
                                    {selectedStudent.subscriptionEndDate ? formatDate(selectedStudent.subscriptionEndDate) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">الحالة الحالية:</span>
                                <span className="font-bold text-forest">
                                    {selectedStudent.liveStatus === 'active' ? 'نشط' : selectedStudent.liveStatus === 'expired' ? 'منتهي' : 'موقوف'}
                                </span>
                            </div>
                        </div>

                        {(actionType === 'extend' || actionType === 'shorten') && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        المدة <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={actionAmount}
                                        onChange={(e) => setActionAmount(e.target.value)}
                                        className="input-field w-full text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        الوحدة <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={actionUnit}
                                        onChange={(e) => setActionUnit(e.target.value as 'days' | 'hours')}
                                        className="input-field w-full text-sm font-bold bg-white"
                                    >
                                        <option value="days">أيام</option>
                                        <option value="hours">ساعات</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                سبب الإجراء (مطلوب للتوثيق الإداري) <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder="اكتب سبب تعديل هذا الاشتراك..."
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                className="input-field w-full text-xs resize-none"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedStudent(null)}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteAction}
                                disabled={actionLoading || !actionReason || actionReason.trim().length < 3}
                                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 shadow-sm ${
                                    actionType === 'extend' || actionType === 'activate'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {actionLoading ? 'جاري التنفيذ...' : 'تأكيد وحفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
