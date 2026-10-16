'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const ACTION_LABELS: Record<string, string> = {
    'security.unauthorized_lesson_access': '⛔ محاولة وصول غير مصرح بها لدرس',
    'security.unauthorized_video_access': '⛔ محاولة وصول غير مصرح بها لفيديو',
    'settings.changed': '⚙️ تغيير إعدادات',
    'admin.login': '🔑 دخول أدمن',
};

const REASON_LABELS: Record<string, string> = {
    no_subscription: 'لا يوجد اشتراك',
    subscription_expired: 'انتهى الاشتراك',
    pending_approval: 'بانتظار موافقة الإدارة',
    not_for_grade: 'درس مختلف الصف',
};

export default function AdminAccessLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (actionFilter) params.set('action', actionFilter);
        fetch(`/api/admin/security/access-logs?${params.toString()}`)
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setLogs(res.data.logs);
                    setTotal(res.data.total);
                }
            })
            .finally(() => setLoading(false));
    }, [page, actionFilter]);

    useEffect(() => { load(); }, [load]);

    const formatDate = (d: string) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
        } catch { return d; }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/admin/settings" className="text-forest hover:underline text-sm font-bold">↩ الإعدادات</Link>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900">سجل محاولات الوصول غير المصرح</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        يُسجَّل هنا تلقائياً كل محاولة للوصول إلى محتوى مدفوع دون صلاحية — لا يُجمع أي بيانات حساسة.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-gray-700">المجموع: {total} حدث</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
                <select
                    value={actionFilter}
                    onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                    className="input-field max-w-xs text-sm"
                >
                    <option value="">كل الأحداث الأمنية</option>
                    <option value="security.unauthorized_lesson_access">محاولات الوصول للدروس</option>
                    <option value="security.unauthorized_video_access">محاولات الوصول للفيديو</option>
                </select>
                <button onClick={load} className="btn-secondary text-sm px-4 py-2">↻ تحديث</button>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="text-gray-500 font-bold">لا توجد محاولات غير مصرح بها مسجلة</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-right px-4 py-3 font-bold text-gray-600">التاريخ</th>
                                    <th className="text-right px-4 py-3 font-bold text-gray-600">الطالب</th>
                                    <th className="text-right px-4 py-3 font-bold text-gray-600">الحدث</th>
                                    <th className="text-right px-4 py-3 font-bold text-gray-600">السبب</th>
                                    <th className="text-right px-4 py-3 font-bold text-gray-600">الدرس</th>
                                    <th className="text-right px-4 py-3 font-bold text-gray-600">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log: any) => (
                                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            {log.actor && typeof log.actor === 'object' ? (
                                                <div>
                                                    <div className="font-bold text-gray-900">{log.actor.name || '—'}</div>
                                                    <div className="text-xs text-gray-400">{log.actor.grade || ''}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">{String(log.actor).slice(-8)}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded">
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {REASON_LABELS[log.metadata?.reason] || log.metadata?.reason || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">
                                            {log.metadata?.lessonTitle || log.target || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > 50 && (
                        <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-4 py-1.5 disabled:opacity-40">→ السابق</button>
                            <span className="text-sm text-gray-500 font-bold py-1.5">صفحة {page}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total} className="btn-secondary text-sm px-4 py-1.5 disabled:opacity-40">التالي ←</button>
                        </div>
                    )}
                </div>
            )}

            {/* Notice about limitations */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
                <p className="font-bold mb-2">📋 ملاحظات حول هذا السجل:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                    <li>يسجل فقط محاولات الطلاب المسجلين الذين يحاولون الوصول بدون صلاحية كافية</li>
                    <li>الطلاب غير المسجلين (بدون JWT) يُحجب وصولهم في middleware قبل الوصول لهذا السجل</li>
                    <li>لا يُسجَّل رقم الهاتف أو البريد الإلكتروني أو أي بيانات شخصية حساسة</li>
                    <li>لا تعتمد على هذا السجل كآلية أمان وحيدة — الفيديوهات المستضافة على YouTube متاحة بروابط التضمين عند معرفة المعرف</li>
                </ul>
            </div>
        </div>
    );
}
