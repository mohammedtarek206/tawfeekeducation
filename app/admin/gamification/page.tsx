'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { gradeLabel } from '@/lib/constants/grades';

/* ─── Types ─── */
interface Student {
    _id: string;
    name: string;
    phone: string;
    points: number;
    grade?: string;
    level?: number;
}

interface AuditEntry {
    id: string;
    actorId: string;
    actorName: string;
    studentId: string;
    studentName: string;
    operationType: 'deduction' | 'reset' | 'adjustment' | 'bulk_reset';
    balanceBefore: number;
    balanceAfter: number;
    deductedAmount: number;
    reason: string;
    createdAt: string;
}

interface Transaction {
    _id?: string;
    id?: string;
    amount: number;
    type: string;
    reason: string;
    balanceAfter: number;
    createdAt: string;
    student?: { name: string; phone: string };
}

interface OverviewData {
    topStudents: Student[];
    totalPointsAwarded: number;
    totalTransactions: number;
    transactions: Transaction[];
}

interface BulkResetStats {
    affectedStudentsCount: number;
    totalPointsToReset: number;
}

/* ─── Helpers ─── */
function formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

/* ─── Subcomponents ─── */
function StatCard({ emoji, value, label }: { emoji: string; value: string | number; label: string }) {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="text-3xl mb-2" suppressHydrationWarning>{emoji}</div>
            <div className="text-3xl font-black text-gray-900" suppressHydrationWarning>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="text-sm font-semibold text-gray-500 mt-1">{label}</div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function AdminGamificationPage() {
    const [tab, setTab] = useState<'overview' | 'manage' | 'audit'>('overview');
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);

    /* — Manage Points State — */
    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Student | null>(null);

    // Selected student transactions
    const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);
    const [txLoading, setTxLoading] = useState(false);

    // Single student Deduct / Reset state
    const [operationType, setOperationType] = useState<'deduction' | 'reset'>('deduction');
    const [deductAmount, setDeductAmount] = useState('');
    const [deductReason, setDeductReason] = useState('');
    const [resetReason, setResetReason] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const requestIdRef = useRef<string>(generateRequestId());

    /* — Bulk Reset State — */
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkStats, setBulkStats] = useState<BulkResetStats | null>(null);
    const [bulkLoadingStats, setBulkLoadingStats] = useState(false);
    const [bulkPhrase, setBulkPhrase] = useState('');
    const [bulkReason, setBulkReason] = useState('');
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkActionMsg, setBulkActionMsg] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

    /* — Audit Log State — */
    const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotal, setAuditTotal] = useState(0);

    /* ─── Fetch Overview ─── */
    const loadOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const res = await fetch('/api/admin/points');
            const json = await res.json();
            if (json.success) setOverview(json.data);
        } catch {}
        setOverviewLoading(false);
    }, []);

    /* ─── Fetch Students for manage tab ─── */
    const loadStudents = useCallback(async (q: string) => {
        setStudentsLoading(true);
        try {
            const params = new URLSearchParams({ status: 'approved', limit: '100' });
            if (q) params.set('search', q);
            const res = await fetch(`/api/admin/students?${params}`);
            const json = await res.json();
            if (json.success) setStudents(json.data?.students || []);
        } catch {}
        setStudentsLoading(false);
    }, []);

    /* ─── Fetch selected student's history ─── */
    const loadStudentHistory = useCallback(async (studentId: string) => {
        setTxLoading(true);
        try {
            const res = await fetch(`/api/admin/points?studentId=${studentId}&limit=50`);
            const json = await res.json();
            if (json.success) {
                setStudentTransactions(json.data.transactions || []);
                if (json.data.student) {
                    setSelected((prev) => (prev ? { ...prev, ...json.data.student } : null));
                }
            }
        } catch {}
        setTxLoading(false);
    }, []);

    /* ─── Fetch Audit Log ─── */
    const loadAudit = useCallback(async (page = 1) => {
        setAuditLoading(true);
        try {
            const res = await fetch(`/api/admin/points/audit-log?page=${page}&limit=20`);
            const json = await res.json();
            if (json.success) {
                setAuditLogs(json.data.logs || []);
                setAuditTotal(json.data.total || 0);
            }
        } catch {}
        setAuditLoading(false);
    }, []);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        if (tab === 'manage') loadStudents(search);
        if (tab === 'audit') loadAudit(auditPage);
    }, [tab, loadStudents, loadAudit, search, auditPage]);

    /* ─── Select Student ─── */
    const handleSelectStudent = (s: Student) => {
        setSelected(s);
        setActionMsg(null);
        setDeductAmount('');
        setDeductReason('');
        setResetReason('');
        loadStudentHistory(s._id);
    };

    /* ─── Quick Trigger Reset For A Student ─── */
    const handleQuickResetStudent = (s: Student) => {
        setSelected(s);
        setActionMsg(null);
        setDeductAmount('');
        setDeductReason('');
        setResetReason('تصفير إداري لرصيد النقاط');
        setOperationType('reset');
        setShowConfirmModal(true);
        loadStudentHistory(s._id);
    };

    /* ─── Search ─── */
    const handleSearch = (q: string) => {
        setSearch(q);
        setSelected(null);
        setStudentTransactions([]);
        loadStudents(q);
    };

    /* ─── Single Student Validation ─── */
    const parsedDeductAmount = parseInt(deductAmount, 10);
    const canDeduct =
        selected &&
        !isNaN(parsedDeductAmount) &&
        parsedDeductAmount > 0 &&
        parsedDeductAmount <= (selected.points || 0) &&
        deductReason.trim().length >= 3;

    const canReset =
        selected &&
        (selected.points || 0) > 0 &&
        resetReason.trim().length >= 3;

    /* ─── Execute Deduction or Reset for Single Student ─── */
    const handleExecuteOperation = async () => {
        if (!selected) return;

        const isReset = operationType === 'reset';
        if (isReset && !canReset) return;
        if (!isReset && !canDeduct) return;

        setSubmitting(true);
        setActionMsg(null);

        try {
            const res = await fetch('/api/admin/points/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selected._id,
                    operationType,
                    amount: isReset ? selected.points : parsedDeductAmount,
                    reason: (isReset ? resetReason : deductReason).trim(),
                    requestId: requestIdRef.current,
                }),
            });

            const json = await res.json();

            if (json.success) {
                const newBalance = json.data?.balanceAfter ?? (isReset ? 0 : selected.points - parsedDeductAmount);
                setActionMsg({ type: 'success', text: json.message });

                // Update selected student in state
                setSelected((prev) => (prev ? { ...prev, points: newBalance } : null));

                // Update student in list
                setStudents((prev) =>
                    prev.map((s) => (s._id === selected._id ? { ...s, points: newBalance } : s))
                );

                // Reset inputs and modal
                setDeductAmount('');
                setDeductReason('');
                setResetReason('');
                requestIdRef.current = generateRequestId();
                setShowConfirmModal(false);

                // Refresh transactions and overview
                await loadStudentHistory(selected._id);
                loadOverview();
            } else {
                setActionMsg({ type: 'error', text: json.message || 'فشلت العملية' });
            }
        } catch {
            setActionMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم أثناء تنفيذ العملية' });
        } finally {
            setSubmitting(false);
        }
    };

    /* ─── Bulk Reset Handlers ─── */
    const handleOpenBulkModal = async () => {
        setBulkPhrase('');
        setBulkReason('');
        setBulkActionMsg(null);
        setShowBulkModal(true);
        setBulkLoadingStats(true);
        try {
            const res = await fetch('/api/admin/points/reset-all');
            const json = await res.json();
            if (json.success) {
                setBulkStats(json.data);
            }
        } catch {
            setBulkStats(null);
        } finally {
            setBulkLoadingStats(false);
        }
    };

    const isBulkPhraseCorrect = bulkPhrase.trim() === 'تصفير جميع النقاط';
    const canSubmitBulk = isBulkPhraseCorrect && bulkReason.trim().length >= 3 && !bulkSubmitting;

    const handleExecuteBulkReset = async () => {
        if (!canSubmitBulk) return;

        setBulkSubmitting(true);
        setBulkActionMsg(null);

        try {
            const res = await fetch('/api/admin/points/reset-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confirmationPhrase: bulkPhrase.trim(),
                    reason: bulkReason.trim(),
                    requestId: generateRequestId(),
                }),
            });

            const json = await res.json();

            if (json.success) {
                setBulkActionMsg({
                    type: 'success',
                    text: json.message || 'تم تصفير نقاط جميع الطلاب بنجاح',
                    details: json.data,
                });

                // Update student points in memory to 0
                setStudents((prev) => prev.map((s) => ({ ...s, points: 0 })));
                if (selected) {
                    setSelected((prev) => (prev ? { ...prev, points: 0 } : null));
                    await loadStudentHistory(selected._id);
                }

                // Refresh overview stats and audit logs
                loadOverview();
                loadAudit(1);
            } else {
                setBulkActionMsg({
                    type: 'error',
                    text: json.message || 'فشلت عملية التصفير الشامل',
                    details: json.data,
                });
            }
        } catch {
            setBulkActionMsg({
                type: 'error',
                text: 'حدث خطأ في الاتصال بالخادم أثناء تنفيذ التصفير الشامل',
            });
        } finally {
            setBulkSubmitting(false);
        }
    };

    const TABS = [
        { key: 'overview', label: '📊 ملخص النقاط' },
        { key: 'manage', label: '📉 إدارة وخصم النقاط' },
        { key: 'audit', label: '📋 سجل التدقيق والخصومات' },
    ] as const;

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span>🪙</span>
                        <span>إدارة النقاط والتدقيق</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        متابعة أرصدة الطلاب، خصم وتصفير النقاط بأمان، واستعراض سجل التدقيق الموثق
                    </p>
                </div>

                {/* Bulk Reset Quick Access Button */}
                <button
                    type="button"
                    onClick={handleOpenBulkModal}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
                >
                    <span>🔄</span>
                    <span>تصفير نقاط جميع الطلاب</span>
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
                            tab === t.key
                                ? 'border-forest text-forest'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB 1: OVERVIEW ─── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {overviewLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-28 bg-gray-100 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : !overview ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-500">
                            لا توجد بيانات متاحة
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard emoji="🪙" value={overview.totalPointsAwarded} label="إجمالي النقاط الممنوحة" />
                                <StatCard emoji="🏆" value={overview.topStudents?.length ?? 0} label="طلاب في الصدارة" />
                                <StatCard emoji="📊" value={overview.totalTransactions} label="إجمالي الحركات المسجلة" />
                            </div>

                            {/* Top Students by points */}
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                        <span>🏆</span>
                                        <span>أعلى الطلاب نقاطًا في المنظومة</span>
                                    </h2>
                                    <button
                                        onClick={() => setTab('manage')}
                                        className="text-xs text-forest font-bold hover:underline"
                                    >
                                        إدارة رصيد طالب ←
                                    </button>
                                </div>
                                {!overview.topStudents?.length ? (
                                    <div className="text-center py-12 text-gray-500">لا توجد بيانات</div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {overview.topStudents.map((s: Student, i: number) => (
                                            <div key={s._id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                                                        i === 0
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : i === 1
                                                            ? 'bg-slate-200 text-slate-700'
                                                            : i === 2
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-900">{s.name}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {gradeLabel(s.grade) || '—'} • المعرف: {s._id}
                                                    </div>
                                                </div>
                                                <div className="text-left flex items-center gap-3">
                                                    <div>
                                                        <div className="font-black text-forest text-base">
                                                            {s.points?.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-gray-400">نقطة</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTab('manage');
                                                            handleSelectStudent(s);
                                                        }}
                                                        className="text-xs px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-forest/10 hover:text-forest text-gray-700 font-bold transition-colors"
                                                    >
                                                        إدارة
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent Transactions */}
                            {overview.transactions?.length > 0 && (
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100">
                                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                            <span>📜</span>
                                            <span>أحدث حركات النقاط العامة</span>
                                        </h2>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {overview.transactions.slice(0, 10).map((t: Transaction, idx: number) => {
                                            const isPositive = t.amount > 0;
                                            return (
                                                <div key={t.id || t._id || idx} className="px-6 py-3.5 flex items-center gap-4 text-sm">
                                                    <div
                                                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                                                            isPositive
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                    >
                                                        {isPositive ? '＋' : '－'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-gray-900">
                                                            {t.student?.name || 'طالب'}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {t.reason} ({getTransactionTypeLabel(t.type)})
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <div
                                                            className={`font-black ${
                                                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                                                            }`}
                                                        >
                                                            {isPositive ? `+${t.amount}` : t.amount}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400">
                                                            {formatDate(t.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── TAB 2: MANAGE & DEDUCT POINTS ─── */}
            {tab === 'manage' && (
                <div className="space-y-6">
                    {/* Bulk Reset Callout Card */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <span className="text-3xl flex-shrink-0">🔄</span>
                            <div>
                                <h3 className="text-base font-black text-red-900">
                                    تصفير نقاط جميع الطلاب دفعة واحدة
                                </h3>
                                <p className="text-xs text-red-700 mt-1 leading-relaxed max-w-xl">
                                    إجراء إداري رسمي يصفّر أرصدة النقاط الحالية لجميع الطلاب المستهدفين (الذين لديهم رصيد أكبر من صفر)، مع الحفاظ التام على حسابات الطلاب واشتراكاتهم وسجلاتهم التاريخية وتوثيق كل حركة.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenBulkModal}
                            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-black transition-all shadow-md shrink-0 flex items-center gap-2"
                        >
                            <span>⚠️</span>
                            <span>تصفير نقاط جميع الطلاب</span>
                        </button>
                    </div>

                    {/* Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-900 flex gap-3 shadow-xs">
                        <span className="text-2xl flex-shrink-0">⚠️</span>
                        <div className="leading-relaxed">
                            <strong>ضوابط إدارة النقاط:</strong> خصم النقاط أو تصفيرها عمليات إدارية رسمية تؤثر على الرصيد الفعلي للطالب ولا يمكن التراجع عنها تلقائيًا. لا يؤدي الخصم أو التصفير إلى حذف حساب الطالب أو تقدمه في الدروس، ويتم توثيق كل عملية في سجل التدقيق غير القابل للتعديل.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Student Search & List Column */}
                        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
                            <div>
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <span>🔍</span>
                                    <span>البحث واختيار الطالب</span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    ابحث بالاسم، رقم الهاتف، أو معرف الطالب
                                </p>
                            </div>

                            <input
                                type="text"
                                placeholder="ابحث بالاسم أو الهاتف أو المعرف..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                            />

                            <div className="max-h-[500px] overflow-y-auto space-y-1.5 divide-y divide-gray-50">
                                {studentsLoading ? (
                                    <div className="text-center py-10">
                                        <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : students.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        لا يوجد طلاب مطابقون
                                    </div>
                                ) : (
                                    students.map((s) => (
                                        <div
                                            key={s._id}
                                            className={`w-full p-3 rounded-2xl text-sm transition-all flex items-center justify-between gap-3 ${
                                                selected?._id === s._id
                                                    ? 'bg-forest/10 border-2 border-forest text-forest'
                                                    : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleSelectStudent(s)}
                                                className="text-right flex-1 truncate"
                                            >
                                                <div className="font-bold truncate">{s.name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {s.phone} • {gradeLabel(s.grade) || 'طالب'}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    ID: {s._id}
                                                </div>
                                            </button>
                                            <div className="text-left shrink-0 flex items-center gap-2">
                                                <div>
                                                    <div className="font-black text-forest">
                                                        {(s.points || 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">نقطة</div>
                                                </div>
                                                {s.points > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickResetStudent(s)}
                                                        title="تصفير نقاط هذا الطالب"
                                                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        🔄 تصفير
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Student Details & Deduction Controls */}
                        <div className="lg:col-span-7 space-y-6">
                            {!selected ? (
                                <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                                    <div className="text-5xl mb-3">👆</div>
                                    <h3 className="font-bold text-gray-800 text-base">
                                        اختر طالباً من القائمة للبدء
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        يمكنك الاطلاع على تفاصيل رصيده، سجل نقاطه، وخصم أو تصفير النقاط
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Selected Student Card */}
                                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                            <div>
                                                <span className="text-[11px] font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full inline-block mb-1">
                                                    بيانات الطالب المحدد
                                                </span>
                                                <h3 className="text-xl font-black text-gray-900">{selected.name}</h3>
                                                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                                    المعرف: {selected._id} • الهاتف: {selected.phone}
                                                </p>
                                            </div>

                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center">
                                                <span className="text-xs text-amber-800 font-bold block">
                                                    الرصيد الحالي
                                                </span>
                                                <span className="text-2xl font-black text-amber-900">
                                                    {(selected.points || 0).toLocaleString()}
                                                </span>
                                                <span className="text-xs text-amber-800 font-semibold mr-1">نقطة</span>
                                            </div>
                                        </div>

                                        {/* Action Message */}
                                        {actionMsg && (
                                            <div
                                                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                                                    actionMsg.type === 'success'
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : 'bg-red-50 text-red-800 border border-red-200'
                                                }`}
                                            >
                                                <span>{actionMsg.type === 'success' ? '✅' : '❌'}</span>
                                                <span>{actionMsg.text}</span>
                                            </div>
                                        )}

                                        {/* Operation Forms */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                            {/* Deduction Card */}
                                            <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📉</span>
                                                    <h4 className="font-bold text-gray-900 text-sm">
                                                        خصم عدد محدد من النقاط
                                                    </h4>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                                        عدد النقاط المراد خصمها <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={selected.points || 0}
                                                        placeholder="أدخل العدد..."
                                                        value={deductAmount}
                                                        onChange={(e) => setDeductAmount(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 bg-white"
                                                    />
                                                    {deductAmount && parsedDeductAmount > (selected.points || 0) && (
                                                        <p className="text-[11px] text-red-600 font-bold mt-1">
                                                            ⛔ القيمة أكبر من الرصيد المتاح ({selected.points})
                                                        </p>
                                                    )}
                                                    {deductAmount && parsedDeductAmount > 0 && parsedDeductAmount <= (selected.points || 0) && (
                                                        <p className="text-[11px] text-emerald-700 font-bold mt-1">
                                                            ✔ الرصيد المتوقع بعد الخصم:{' '}
                                                            {((selected.points || 0) - parsedDeductAmount).toLocaleString()} نقطة
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                                        سبب الخصم (مطلوب) <span className="text-red-500">*</span>
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        placeholder="مثال: خصم بسبب مخالفة شروط الاستخدام..."
                                                        value={deductReason}
                                                        onChange={(e) => setDeductReason(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 bg-white resize-none"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={!canDeduct}
                                                    onClick={() => {
                                                        setOperationType('deduction');
                                                        setShowConfirmModal(true);
                                                    }}
                                                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                                                >
                                                    مراجعة وتأكيد الخصم
                                                </button>
                                            </div>

                                            {/* Reset Card */}
                                            <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">🔄</span>
                                                        <h4 className="font-bold text-red-900 text-sm">
                                                            تصفير نقاط الطالب بالكامل
                                                        </h4>
                                                    </div>

                                                    <p className="text-xs text-red-700 leading-relaxed">
                                                        سيتم خصم كامل الرصيد (<strong>{(selected.points || 0).toLocaleString()} نقطة</strong>) ليصبح الرصيد 0. لا يتم حذف الحساب أو السجل التاريخي.
                                                    </p>

                                                    <div>
                                                        <label className="block text-xs font-bold text-red-900 mb-1">
                                                            سبب التصفير (مطلوب) <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="سبب تصفير النقاط بالكامل..."
                                                            value={resetReason}
                                                            onChange={(e) => setResetReason(e.target.value)}
                                                            className="w-full border border-red-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 bg-white resize-none"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={!canReset}
                                                    onClick={() => {
                                                        setOperationType('reset');
                                                        setShowConfirmModal(true);
                                                    }}
                                                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                                                >
                                                    {selected.points === 0 ? 'الرصيد صفر بالفعل' : 'تصفير النقاط (Reset)'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Ledger / History */}
                                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                <span>📜</span>
                                                <span>سجل حركات نقاط الطالب ومصادرها</span>
                                            </h4>
                                            <button
                                                onClick={() => loadStudentHistory(selected._id)}
                                                className="text-xs text-forest hover:underline font-bold"
                                            >
                                                تحديث السجل 🔄
                                            </button>
                                        </div>

                                        {txLoading ? (
                                            <div className="py-12 text-center">
                                                <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
                                            </div>
                                        ) : studentTransactions.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 text-xs">
                                                لا توجد حركات نقاط مسجلة لهذا الطالب
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto max-h-72">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-gray-500 font-bold">
                                                            <th className="px-4 py-2.5 text-right">المعاملة / المصدر</th>
                                                            <th className="px-4 py-2.5 text-center">المبلغ</th>
                                                            <th className="px-4 py-2.5 text-center">الرصيد بعد</th>
                                                            <th className="px-4 py-2.5 text-left">التاريخ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {studentTransactions.map((tx, idx) => {
                                                            const isPositive = tx.amount > 0;
                                                            return (
                                                                <tr key={tx._id || tx.id || idx} className="hover:bg-gray-50/50">
                                                                    <td className="px-4 py-2.5">
                                                                        <div className="font-bold text-gray-900">
                                                                            {tx.reason}
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400">
                                                                            المصدر: {getTransactionTypeLabel(tx.type)}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center font-bold">
                                                                        <span
                                                                            className={
                                                                                isPositive
                                                                                    ? 'text-emerald-600'
                                                                                    : 'text-rose-600 font-black'
                                                                            }
                                                                        >
                                                                            {isPositive ? `+${tx.amount}` : tx.amount}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center font-semibold text-gray-700">
                                                                        {tx.balanceAfter}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-left text-gray-400 text-[10px] whitespace-nowrap">
                                                                        {formatDate(tx.createdAt)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 3: AUDIT LOG ─── */}
            {tab === 'audit' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <span>📋</span>
                                <span>سجل تدقيق عمليات الخصم والتصفير</span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                سجل موثق غير قابل للتعديل أو الحذف يعرض جميع عمليات الخصم والتصفير الفردية والجماعية
                            </p>
                        </div>
                        <button
                            onClick={() => loadAudit(auditPage)}
                            disabled={auditLoading}
                            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                            <span className={auditLoading ? 'animate-spin inline-block' : ''}>🔄</span>
                            <span>تحديث السجل</span>
                        </button>
                    </div>

                    {auditLoading ? (
                        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                            <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-400 text-xs font-semibold">جاري تحميل سجل التدقيق...</p>
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                            <div className="text-4xl mb-3">📋</div>
                            <h3 className="font-bold text-gray-800 text-base">لا توجد عمليات خصم أو تصفير مسجلة</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                ستظهر هنا جميع العمليات المنفذة بواسطة الأدمن فور حدوثها
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold">
                                            <th className="px-5 py-3.5 text-right">نوع العملية</th>
                                            <th className="px-5 py-3.5 text-right">الطالب / المستهدف</th>
                                            <th className="px-5 py-3.5 text-center">الرصيد قبل</th>
                                            <th className="px-5 py-3.5 text-center">الخصم</th>
                                            <th className="px-5 py-3.5 text-center">الرصيد بعد</th>
                                            <th className="px-5 py-3.5 text-right">سبب العملية</th>
                                            <th className="px-5 py-3.5 text-right">الأدمن المنفذ</th>
                                            <th className="px-5 py-3.5 text-left">التاريخ والوقت</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {auditLogs.map((log) => {
                                            const isReset = log.operationType === 'reset';
                                            const isBulk = log.operationType === 'bulk_reset';
                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                    {/* Operation Type Badge */}
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                                                                isBulk
                                                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                                    : isReset
                                                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            }`}
                                                        >
                                                            <span>{isBulk ? '⚡' : isReset ? '🔄' : '📉'}</span>
                                                            <span>
                                                                {isBulk ? 'تصفير شامل' : isReset ? 'تصفير كامل' : 'خصم جزئي'}
                                                            </span>
                                                        </span>
                                                    </td>

                                                    {/* Student Info */}
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-gray-900">{log.studentName}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">
                                                            {log.studentId}
                                                        </div>
                                                    </td>

                                                    {/* Balance Before */}
                                                    <td className="px-5 py-4 text-center font-bold text-gray-700">
                                                        {log.balanceBefore.toLocaleString()}
                                                    </td>

                                                    {/* Deducted Amount */}
                                                    <td className="px-5 py-4 text-center font-black text-rose-600">
                                                        −{log.deductedAmount.toLocaleString()}
                                                    </td>

                                                    {/* Balance After */}
                                                    <td className="px-5 py-4 text-center font-black text-emerald-700">
                                                        {log.balanceAfter.toLocaleString()}
                                                    </td>

                                                    {/* Reason */}
                                                    <td className="px-5 py-4 text-xs text-gray-700 max-w-xs truncate" title={log.reason}>
                                                        {log.reason}
                                                    </td>

                                                    {/* Admin Actor */}
                                                    <td className="px-5 py-4 text-xs text-gray-600">
                                                        <div className="font-bold">{log.actorName}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">
                                                            {log.actorId}
                                                        </div>
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-5 py-4 text-left text-xs text-gray-400 whitespace-nowrap">
                                                        {formatDate(log.createdAt)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {Math.ceil(auditTotal / 20) > 1 && (
                                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600 bg-gray-50/30">
                                    <button
                                        disabled={auditPage <= 1}
                                        onClick={() => {
                                            const p = auditPage - 1;
                                            setAuditPage(p);
                                            loadAudit(p);
                                        }}
                                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors shadow-2xs"
                                    >
                                        السابق
                                    </button>
                                    <span>
                                        صفحة {auditPage} من {Math.ceil(auditTotal / 20)} ({auditTotal} سجل)
                                    </span>
                                    <button
                                        disabled={auditPage >= Math.ceil(auditTotal / 20)}
                                        onClick={() => {
                                            const p = auditPage + 1;
                                            setAuditPage(p);
                                            loadAudit(p);
                                        }}
                                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors shadow-2xs"
                                    >
                                        التالي
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ─── SINGLE STUDENT CONFIRMATION MODAL ─── */}
            {showConfirmModal && selected && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner ${
                                operationType === 'reset'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-rose-50 text-rose-600'
                            }`}
                        >
                            {operationType === 'reset' ? '🔄' : '⚠️'}
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl font-black text-gray-900">
                                {operationType === 'reset'
                                    ? 'تأكيد تصفير نقاط الطالب'
                                    : 'تأكيد خصم النقاط'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                يرجى مراجعة تفاصيل العملية بدقة قبل الإرسال
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">اسم الطالب:</span>
                                <span className="font-black text-gray-900">{selected.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">معرف الطالب:</span>
                                <span className="font-mono text-gray-700">{selected._id}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200/60 pt-2">
                                <span className="text-gray-500 font-bold">الرصيد الحالي:</span>
                                <span className="font-bold text-gray-800">
                                    {(selected.points || 0).toLocaleString()} نقطة
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">المبلغ المخصوم:</span>
                                <span className="font-black text-rose-600">
                                    −
                                    {(operationType === 'reset'
                                        ? selected.points
                                        : parsedDeductAmount
                                    ).toLocaleString()}{' '}
                                    نقطة
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200/60 pt-2">
                                <span className="text-gray-500 font-bold">الرصيد بعد العملية:</span>
                                <span className="font-black text-emerald-700">
                                    {(operationType === 'reset'
                                        ? 0
                                        : (selected.points || 0) - parsedDeductAmount
                                    ).toLocaleString()}{' '}
                                    نقطة
                                </span>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                            <span className="font-bold text-amber-800 block mb-0.5">السبب المسجل:</span>
                            <span className="text-amber-900 font-medium">
                                {operationType === 'reset' ? resetReason : deductReason}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={submitting}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteOperation}
                                disabled={submitting}
                                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 ${
                                    operationType === 'reset'
                                        ? 'bg-red-700 hover:bg-red-800'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>جاري التنفيذ...</span>
                                    </>
                                ) : (
                                    <span>
                                        {operationType === 'reset' ? 'تأكيد التصفير 🔄' : 'تأكيد الخصم 📉'}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── BULK RESET CONFIRMATION MODAL ─── */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
                        <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-700 flex items-center justify-center text-3xl mx-auto shadow-inner">
                            ⚠️
                        </div>

                        <div className="text-center">
                            <h3 className="text-2xl font-black text-gray-900">
                                تصفير نقاط جميع الطلاب
                            </h3>
                            <p className="text-xs text-red-600 font-bold mt-1">
                                تنبيه: هذا الإجراء سيصفّر أرصدة النقاط الحالية لجميع الطلاب المستهدفين
                            </p>
                        </div>

                        {/* Stats Banner */}
                        <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4">
                            {bulkLoadingStats ? (
                                <div className="text-center py-2 text-xs text-red-600 font-bold flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                    <span>جاري فحص عدد الطلاب المتأثرين...</span>
                                </div>
                            ) : bulkStats ? (
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="bg-white p-3 rounded-xl border border-red-100">
                                        <div className="text-2xl font-black text-red-700">
                                            {bulkStats.affectedStudentsCount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 font-bold mt-0.5">
                                            طالب متأثر (رصيدهم &gt; 0)
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-red-100">
                                        <div className="text-2xl font-black text-red-700">
                                            {bulkStats.totalPointsToReset.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 font-bold mt-0.5">
                                            إجمالي النقاط المراد تصفيرها
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-xs text-red-600">
                                    تعذر تحميل الإحصائيات الفورية
                                </div>
                            )}
                        </div>

                        {/* Safety Notice */}
                        <div className="bg-gray-50 rounded-2xl p-3.5 text-xs text-gray-600 space-y-1 leading-relaxed border border-gray-100">
                            <div className="font-bold text-gray-800">🛡️ ضمانات الأمان وسجل النقاط:</div>
                            <div>• لن يتم حذف أي حساب، أو اشتراك، أو إنجاز، أو سجل حضور.</div>
                            <div>• يتم الحفاظ على السجلات التاريخية مع إضافة معاملة تصحيحية موثقة لكل طالب.</div>
                            <div>• يتم توثيق العملية بالكامل في سجل التدقيق الإداري.</div>
                        </div>

                        {/* Action Message / Result */}
                        {bulkActionMsg && (
                            <div
                                className={`p-4 rounded-2xl text-xs font-bold space-y-1.5 ${
                                    bulkActionMsg.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-red-50 text-red-800 border border-red-200'
                                }`}
                            >
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <span>{bulkActionMsg.type === 'success' ? '✅' : '❌'}</span>
                                    <span>{bulkActionMsg.text}</span>
                                </div>
                                {bulkActionMsg.details && (
                                    <div className="text-[11px] font-normal text-gray-600 pt-1">
                                        عدد الطلاب المعالجين: <strong>{bulkActionMsg.details.affectedCount}</strong> • الحالات المتعثرة: <strong>{bulkActionMsg.details.failedCount}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Form Inputs (hidden if success) */}
                        {bulkActionMsg?.type !== 'success' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 mb-1">
                                        سبب التصفير الشامل (مطلوب) <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="مثال: بدء الفصل الدراسي الثاني / تجديد الموسم..."
                                        value={bulkReason}
                                        onChange={(e) => setBulkReason(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-800 mb-1">
                                        لتأكيد التصفير، اكتب العبارة التالية نصاً:{' '}
                                        <code className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-black">
                                            تصفير جميع النقاط
                                        </code>{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="اكتب: تصفير جميع النقاط"
                                        value={bulkPhrase}
                                        onChange={(e) => setBulkPhrase(e.target.value)}
                                        className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 transition-all ${
                                            isBulkPhraseCorrect
                                                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30 font-bold text-emerald-900'
                                                : 'border-gray-300 focus:ring-red-500/30'
                                        }`}
                                    />
                                    {bulkPhrase && !isBulkPhraseCorrect && (
                                        <p className="text-[11px] text-red-600 font-bold mt-1">
                                            ❌ العبارة المدخلة غير مطابقة
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                disabled={bulkSubmitting}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                {bulkActionMsg?.type === 'success' ? 'إغلاق' : 'إلغاء'}
                            </button>

                            {bulkActionMsg?.type !== 'success' && (
                                <button
                                    type="button"
                                    onClick={handleExecuteBulkReset}
                                    disabled={!canSubmitBulk || (bulkStats?.affectedStudentsCount === 0)}
                                    className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    {bulkSubmitting ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>جاري التصفير الشامل...</span>
                                        </>
                                    ) : (
                                        <span>تأكيد التصفير الشامل لجميع الطلاب 🔄</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
