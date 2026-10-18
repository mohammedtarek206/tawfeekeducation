'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/* ─── Types ─── */
interface Student {
    _id: string;
    name: string;
    phone: string;
    points: number;
    grade?: string;
}

interface AuditEntry {
    id: string;
    actor: string;
    studentName: string;
    studentId: string;
    balanceBefore: number;
    balanceAfter: number;
    deductedAmount: number;
    reason: string;
    createdAt: string;
}

interface Transaction {
    id: string;
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

/* ─── Helpers ─── */
function formatDate(d: string) {
    return new Date(d).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Subcomponents ─── */
function StatCard({ emoji, value, label }: { emoji: string; value: string | number; label: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-3xl mb-2" suppressHydrationWarning>{emoji}</div>
            <div className="text-3xl font-black text-gray-900" suppressHydrationWarning>{typeof value === 'number' ? value.toLocaleString() : value}</div>
            <div className="text-sm font-medium text-gray-500 mt-1">{label}</div>
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
    const [deductAmount, setDeductAmount] = useState('');
    const [deductReason, setDeductReason] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [deducting, setDeducting] = useState(false);
    const [deductMsg, setDeductMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const requestIdRef = useRef<string>(generateRequestId());

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
        } catch { }
        setOverviewLoading(false);
    }, []);

    /* ─── Fetch Students ─── */
    const loadStudents = useCallback(async () => {
        setStudentsLoading(true);
        try {
            const res = await fetch('/api/admin/points');
            const json = await res.json();
            if (json.success) {
                setStudents(json.data.topStudents || []);
            }
        } catch { }
        setStudentsLoading(false);
    }, []);

    /* ─── Fetch all students for manage tab ─── */
    const loadAllStudents = useCallback(async (q: string) => {
        setStudentsLoading(true);
        try {
            const params = new URLSearchParams({ status: 'approved', limit: '100' });
            if (q) params.set('search', q);
            const res = await fetch(`/api/admin/students?${params}`);
            const json = await res.json();
            if (json.success) setStudents(json.data?.students || []);
        } catch { }
        setStudentsLoading(false);
    }, []);

    /* ─── Fetch Audit Log ─── */
    const loadAudit = useCallback(async (page = 1) => {
        setAuditLoading(true);
        try {
            const res = await fetch(`/api/admin/points/audit-log?page=${page}&limit=20`);
            const json = await res.json();
            if (json.success) {
                setAuditLogs(json.data.logs);
                setAuditTotal(json.data.total);
            }
        } catch { }
        setAuditLoading(false);
    }, []);

    useEffect(() => { loadOverview(); }, [loadOverview]);

    useEffect(() => {
        if (tab === 'manage') loadAllStudents(search);
        if (tab === 'audit') loadAudit(auditPage);
    }, [tab]);

    /* ─── Search Students ─── */
    const handleSearch = useCallback((q: string) => {
        setSearch(q);
        setSelected(null);
        loadAllStudents(q);
    }, [loadAllStudents]);

    /* ─── Validation ─── */
    const parsedAmount = parseInt(deductAmount);
    const canDeduct = selected
        && deductAmount
        && !isNaN(parsedAmount)
        && parsedAmount > 0
        && parsedAmount <= (selected.points || 0)
        && deductReason.trim().length >= 3;

    /* ─── Deduct Handler ─── */
    const handleDeduct = async () => {
        if (!selected || !canDeduct) return;
        setDeducting(true);
        setDeductMsg(null);
        try {
            const res = await fetch('/api/admin/points/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selected._id,
                    amount: parsedAmount,
                    reason: deductReason.trim(),
                    requestId: requestIdRef.current,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setDeductMsg({ type: 'success', text: json.message });
                // Refresh student's balance in list
                setStudents(prev =>
                    prev.map(s => s._id === selected._id ? { ...s, points: json.data.balanceAfter } : s)
                );
                setSelected(prev => prev ? { ...prev, points: json.data.balanceAfter } : null);
                setDeductAmount('');
                setDeductReason('');
                requestIdRef.current = generateRequestId(); // new id for next request
                setShowConfirm(false);
                // Refresh overview
                loadOverview();
            } else {
                setDeductMsg({ type: 'error', text: json.message || 'فشلت العملية' });
            }
        } catch {
            setDeductMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم' });
        }
        setDeducting(false);
    };

    const filteredStudents = students.filter(s =>
        !search || s.name.includes(search) || s._id.includes(search)
    );

    const TABS = [
        { key: 'overview', label: '📊 النقاط والسجلات' },
        { key: 'manage', label: '📉 إدارة النقاط' },
        { key: 'audit', label: '📋 سجل الخصومات' },
    ] as const;

    return (
        <div className="space-y-6" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">إدارة النقاط والمكافآت</h1>
                <p className="text-gray-500 mt-1">متابعة نظام النقاط وإدارة رصيد الطلاب</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${tab === t.key
                            ? 'border-green-700 text-green-800'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB: Overview ─── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {overviewLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : !overview ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-500">
                            لا يوجد بيانات
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard emoji="🪙" value={overview.totalPointsAwarded} label="إجمالي النقاط الممنوحة" />
                                <StatCard emoji="🏆" value={overview.topStudents?.length ?? 0} label="طلاب في المتصدرين" />
                                <StatCard emoji="📊" value={overview.totalTransactions} label="إجمالي المعاملات" />
                            </div>

                            {/* Top Students */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="font-bold text-gray-900">🏆 قائمة المتصدرين</h2>
                                    <button
                                        onClick={() => setTab('manage')}
                                        className="text-xs text-green-800 font-bold hover:underline"
                                    >
                                        إدارة النقاط ←
                                    </button>
                                </div>
                                {!overview.topStudents?.length ? (
                                    <div className="text-center py-12 text-gray-500">لا يوجد بيانات</div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {overview.topStudents.map((s: Student, i: number) => (
                                            <div key={s._id} className="px-6 py-4 flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0
                          ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-900">{s.name}</div>
                                                    <div className="text-xs text-gray-400">{s.grade || '—'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-green-800" suppressHydrationWarning>{s.points?.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">نقطة</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent Transactions */}
                            {overview.transactions?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100">
                                        <h2 className="font-bold text-gray-900">📜 آخر المعاملات</h2>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {overview.transactions.slice(0, 10).map((t: Transaction) => (
                                            <div key={t.id} className="px-6 py-3 flex items-center gap-4 text-sm">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${t.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {t.amount > 0 ? '＋' : '－'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{t.student?.name || '—'}</div>
                                                    <div className="text-xs text-gray-400">{t.reason}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-black ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">{formatDate(t.createdAt)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── TAB: Manage Points ─── */}
            {tab === 'manage' && (
                <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex gap-3">
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div>
                            <strong>تنبيه:</strong> خصم النقاط عملية لا يمكن التراجع عنها. تأكد من صحة البيانات قبل التأكيد. جميع العمليات مُسجَّلة في سجل التدقيق.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Student Selection */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="font-bold text-gray-900">🔍 اختر الطالب</h2>
                            </div>
                            <div className="p-5 space-y-3">
                                <input
                                    type="text"
                                    placeholder="ابحث بالاسم..."
                                    value={search}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                                />
                                <div className="max-h-80 overflow-y-auto space-y-1">
                                    {studentsLoading ? (
                                        <div className="text-center py-8">
                                            <div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : filteredStudents.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">لا يوجد طلاب</div>
                                    ) : (
                                        filteredStudents.map(s => (
                                            <button
                                                key={s._id}
                                                onClick={() => { setSelected(s); setDeductMsg(null); setDeductAmount(''); setDeductReason(''); }}
                                                className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between gap-3 ${selected?._id === s._id
                                                    ? 'bg-green-100 border-2 border-green-500 text-green-900'
                                                    : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
                                                    }`}
                                            >
                                                <div>
                                                    <div className="font-bold">{s.name}</div>
                                                    <div className="text-xs text-gray-400">{s.grade || '—'}</div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="font-black text-green-800">{(s.points || 0).toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-400">نقطة</div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Deduct Form */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="font-bold text-gray-900">📉 خصم النقاط</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                {!selected ? (
                                    <div className="text-center py-12 text-gray-400 text-sm">
                                        <div className="text-4xl mb-2">👆</div>
                                        اختر طالباً من القائمة اليسار
                                    </div>
                                ) : (
                                    <>
                                        {/* Selected Student Info */}
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                            <div className="text-sm text-green-700 font-medium mb-1">الطالب المحدد</div>
                                            <div className="font-black text-green-900 text-lg">{selected.name}</div>
                                            <div className="text-sm text-green-700 mt-1">
                                                الرصيد الحالي: <strong>{(selected.points || 0).toLocaleString()} نقطة</strong>
                                            </div>
                                        </div>

                                        {/* Amount Input */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                                عدد النقاط المراد خصمها <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={selected.points || 0}
                                                placeholder="أدخل عدد النقاط..."
                                                value={deductAmount}
                                                onChange={e => setDeductAmount(e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                                            />
                                            {deductAmount && !isNaN(parsedAmount) && parsedAmount > (selected.points || 0) && (
                                                <p className="text-xs text-red-600 mt-1 font-bold">
                                                    ⛔ الرصيد ({selected.points}) أقل من المبلغ المطلوب خصمه
                                                </p>
                                            )}
                                            {deductAmount && !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= (selected.points || 0) && (
                                                <p className="text-xs text-green-700 mt-1 font-semibold">
                                                    ✔ الرصيد بعد الخصم: {(selected.points - parsedAmount).toLocaleString()} نقطة
                                                </p>
                                            )}
                                            {/* Quick deduct all */}
                                            {(selected.points || 0) > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeductAmount(String(selected.points))}
                                                    className="mt-1.5 text-xs text-rose-600 font-bold hover:underline"
                                                >
                                                    خصم جميع النقاط ({selected.points})
                                                </button>
                                            )}
                                        </div>

                                        {/* Reason Input */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                                سبب الخصم <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                placeholder="اكتب سبب الخصم هنا (سيتم تسجيله في سجل التدقيق)..."
                                                value={deductReason}
                                                onChange={e => setDeductReason(e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 resize-none"
                                            />
                                            <div className="text-[11px] text-gray-400 mt-0.5 text-left">{deductReason.trim().length}/200</div>
                                        </div>

                                        {/* Feedback */}
                                        {deductMsg && (
                                            <div className={`rounded-xl px-4 py-3 text-sm font-bold ${deductMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                {deductMsg.type === 'success' ? '✅' : '❌'} {deductMsg.text}
                                            </div>
                                        )}

                                        {/* Deduct Button */}
                                        <button
                                            type="button"
                                            disabled={!canDeduct}
                                            onClick={() => setShowConfirm(true)}
                                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            📉 خصم النقاط
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: Audit Log ─── */}
            {tab === 'audit' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-gray-900">📋 سجل عمليات خصم النقاط</h2>
                            <p className="text-sm text-gray-500">إجمالي {auditTotal} عملية</p>
                        </div>
                        <button
                            onClick={() => loadAudit(auditPage)}
                            disabled={auditLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                        >
                            <span className={auditLoading ? 'animate-spin inline-block' : ''}>🔄</span>
                            تحديث
                        </button>
                    </div>

                    {auditLoading ? (
                        <div className="text-center py-16">
                            <div className="inline-block w-8 h-8 border-3 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
                            <div className="text-4xl mb-3">📋</div>
                            <p className="text-gray-600 font-bold">لا توجد عمليات خصم مسجّلة بعد</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 text-xs font-bold text-right">
                                            <th className="px-4 py-3">الطالب</th>
                                            <th className="px-4 py-3 text-center">قبل</th>
                                            <th className="px-4 py-3 text-center">الخصم</th>
                                            <th className="px-4 py-3 text-center">بعد</th>
                                            <th className="px-4 py-3">السبب</th>
                                            <th className="px-4 py-3">نفّذه</th>
                                            <th className="px-4 py-3">التاريخ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-900">{log.studentName}</td>
                                                <td className="px-4 py-3 text-center font-bold text-gray-700">{log.balanceBefore.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-black text-rose-600">−{log.deductedAmount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-green-700">{log.balanceAfter.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={log.reason}>{log.reason}</td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">{log.actor}</td>
                                                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {Math.ceil(auditTotal / 20) > 1 && (
                                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
                                    <button
                                        disabled={auditPage <= 1}
                                        onClick={() => { const p = auditPage - 1; setAuditPage(p); loadAudit(p); }}
                                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold disabled:opacity-40 hover:bg-gray-200 transition-colors"
                                    >
                                        السابق
                                    </button>
                                    <span className="text-gray-500">
                                        صفحة {auditPage} من {Math.ceil(auditTotal / 20)}
                                    </span>
                                    <button
                                        disabled={auditPage >= Math.ceil(auditTotal / 20)}
                                        onClick={() => { const p = auditPage + 1; setAuditPage(p); loadAudit(p); }}
                                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold disabled:opacity-40 hover:bg-gray-200 transition-colors"
                                    >
                                        التالي
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Confirmation Modal ─── */}
            {showConfirm && selected && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                        {/* Modal Header */}
                        <div className="bg-rose-50 border-b border-rose-100 px-6 py-5">
                            <div className="text-4xl mb-1 text-center">⚠️</div>
                            <h3 className="text-xl font-black text-rose-800 text-center">تأكيد خصم النقاط</h3>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 text-sm">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">الطالب</span>
                                    <span className="font-black text-gray-900">{selected.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">الرصيد الحالي</span>
                                    <span className="font-bold text-gray-700">{(selected.points || 0).toLocaleString()} نقطة</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">يُخصم</span>
                                    <span className="font-black text-rose-600">−{parsedAmount.toLocaleString()} نقطة</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-2">
                                    <span className="text-gray-500">الرصيد بعد الخصم</span>
                                    <span className="font-black text-green-700">{((selected.points || 0) - parsedAmount).toLocaleString()} نقطة</span>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <div className="text-xs text-amber-700 font-bold mb-1">السبب المسجَّل:</div>
                                <div className="text-amber-900 text-sm">{deductReason}</div>
                            </div>
                        </div>

                        {/* Modal Buttons */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={deducting}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleDeduct}
                                disabled={deducting}
                                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deducting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        جاري التنفيذ...
                                    </>
                                ) : '✅ تأكيد الخصم'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
