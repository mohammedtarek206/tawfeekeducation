'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
    new: { label: 'جديدة', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    completed: { label: 'مكتملة ✓', color: 'bg-green-100 text-green-700 border-green-200' },
    overdue: { label: 'متأخرة', color: 'bg-red-100 text-red-700 border-red-200' },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
    watch_lesson: '📺 مشاهدة حصة',
    solve_exam: '📝 حل اختبار',
    login_streak: '🔥 تسجيل دخول متتالي',
    custom: '🎯 مهمة خاصة',
};

export default function StudentTasksPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'new' | 'completed' | 'overdue'>('all');
    const [completing, setCompleting] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    const loadTasks = () => {
        setLoading(true);
        fetch('/api/student/tasks')
            .then(r => r.json())
            .then(res => { if (res.success) setData(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadTasks(); }, []);

    const handleComplete = async (taskId: string) => {
        if (completing) return;
        setCompleting(taskId);
        setMsg('');
        try {
            const res = await fetch(`/api/student/tasks/${taskId}/complete`, { method: 'POST' });
            const json = await res.json();
            setMsg(json.message || (json.success ? '✅ تم!' : '❌ خطأ'));
            if (json.success) loadTasks();
        } catch {
            setMsg('❌ خطأ في الاتصال');
        } finally {
            setCompleting(null);
            setTimeout(() => setMsg(''), 5000);
        }
    };

    if (loading) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}</div>;

    if (!data) return <div className="text-center py-10 text-red-500">خطأ في جلب البيانات</div>;

    const { tasks, summary } = data;

    const filtered = tasks.filter((t: any) => {
        if (filter === 'all') return true;
        return t.status === filter;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">🎯 مهامي</h1>
                    <p className="text-gray-500 text-sm mt-1">المهام والواجبات المطلوبة منك من المستر</p>
                </div>
                <Link href="/student/dashboard" className="text-forest text-sm font-semibold hover:underline">
                    ← العودة للوحة التحكم
                </Link>
            </div>

            {/* Feedback Message */}
            {msg && (
                <div className={`rounded-xl p-3 font-bold text-sm text-center border ${msg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {msg}
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'الإجمالي', count: summary.total, color: 'bg-gray-50 text-gray-700' },
                    { label: 'جديدة', count: summary.new, color: 'bg-blue-50 text-blue-700' },
                    { label: 'مكتملة', count: summary.completed, color: 'bg-green-50 text-green-700' },
                    { label: 'متأخرة', count: summary.overdue, color: 'bg-red-50 text-red-700' },
                ].map(item => (
                    <div key={item.label} className={`card text-center p-4 ${item.color}`}>
                        <div className="text-3xl font-black">{item.count}</div>
                        <div className="text-sm font-bold mt-1">{item.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {([
                    { key: 'all', label: 'الكل' },
                    { key: 'new', label: '🆕 جديدة' },
                    { key: 'completed', label: '✅ مكتملة' },
                    { key: 'overdue', label: '⏰ متأخرة' },
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${filter === f.key ? 'bg-forest text-white' : 'bg-gray-100 text-gray-600 hover:bg-forest/10'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Task List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-5xl mb-4">🎉</div>
                    <p className="text-gray-500 font-bold">لا توجد مهام في هذا التصنيف</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((task: any) => {
                        const s = STATUS_STYLE[task.status] || STATUS_STYLE['new'];
                        const isOverdue = task.status === 'overdue';
                        return (
                            <div
                                key={task._id}
                                className={`card border ${isOverdue ? 'border-red-200 bg-red-50/30' : task.isCompleted ? 'border-green-200 bg-green-50/20' : 'border-gray-100'} transition-all hover:shadow-md`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Badges */}
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                                            {task.isMandatory && (
                                                <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-bold">⚡ إجباري</span>
                                            )}
                                            <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full font-bold">
                                                🪙 {task.points} نقطة
                                            </span>
                                            {task.targetType && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                    {TARGET_TYPE_LABELS[task.targetType] || task.targetType}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-black text-gray-900 text-base mb-1">{task.title}</h3>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                                        )}

                                        {/* Meta */}
                                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                            {task.endDate && (
                                                <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                                                    ⏰ الموعد النهائي: {new Date(task.endDate).toLocaleDateString('ar-EG')}
                                                </span>
                                            )}
                                            {task.completedAt && (
                                                <span className="text-green-600 font-bold">
                                                    ✓ أُتمّت: {new Date(task.completedAt).toLocaleDateString('ar-EG')}
                                                </span>
                                            )}
                                            {task.pointsEarned > 0 && (
                                                <span className="text-amber-700 font-bold">+{task.pointsEarned} نقطة مكتسبة</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {task.link && (
                                            <a
                                                href={task.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-center"
                                            >
                                                🔗 فتح الرابط
                                            </a>
                                        )}
                                        {!task.isCompleted && !isOverdue && (
                                            <button
                                                onClick={() => handleComplete(task._id)}
                                                disabled={completing === task._id}
                                                className="text-xs font-bold px-4 py-2 rounded-xl bg-forest text-white hover:bg-forest-light transition-colors disabled:opacity-60"
                                            >
                                                {completing === task._id ? '⏳ جاري...' : '✅ إكمال المهمة'}
                                            </button>
                                        )}
                                        {task.isCompleted && (
                                            <div className="text-center text-green-600 font-black text-sm">✓ مكتملة</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
