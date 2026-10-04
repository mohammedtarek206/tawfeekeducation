'use client';

import { useEffect, useState } from 'react';
import { ACTIVE_GRADES } from '@/lib/constants/grades';
import { SUBJECTS } from '@/lib/constants/subjects';

const TARGET_TYPES = [
    { value: 'custom', label: 'مهمة خاصة' },
    { value: 'watch_lesson', label: 'مشاهدة حصة' },
    { value: 'solve_exam', label: 'حل اختبار' },
    { value: 'login_streak', label: 'تسجيل دخول متتالي' },
];

const EMPTY_FORM = {
    title: '',
    description: '',
    points: 10,
    grade: 'first_secondary',
    subject: '',
    targetType: 'custom',
    targetCount: 1,
    isPublished: true,
};

export default function AdminTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadTasks = () => {
        setLoading(true);
        fetch('/api/admin/tasks')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setTasks(res.data?.tasks || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadTasks();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            setError('عنوان المهمة مطلوب');
            return;
        }
        if (!form.grade) {
            setError('يجب اختيار الصف الدراسي');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const url = editingId ? `/api/admin/tasks/${editingId}` : '/api/admin/tasks';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (!data.success) {
                setError(data.message || 'حدث خطأ أثناء الحفظ');
                return;
            }

            setSuccess(editingId ? 'تم تعديل المهمة بنجاح ✅' : 'تمت إضافة المهمة بنجاح ✅');
            setShowForm(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
            loadTasks();
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (task: any) => {
        setEditingId(task._id);
        setForm({
            title: task.title || '',
            description: task.description || '',
            points: task.points || 10,
            grade: task.grade || 'first_secondary',
            subject: task.subject || '',
            targetType: task.targetType || 'custom',
            targetCount: task.targetCount || 1,
            isPublished: task.isPublished ?? true,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`هل أنت متأكد من حذف المهمة «${title}»؟`)) return;
        try {
            const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadTasks();
                setSuccess('تم حذف المهمة بنجاح');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                alert(data.message || 'خطأ في الحذف');
            }
        } catch {
            alert('خطأ في الاتصال');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة المهام والواجبات</h1>
                    <p className="text-gray-500 mt-1">إضافة وتخصيص المهام التفاعلية للطلاب للحصول على نقاط وتحديات</p>
                </div>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        if (!showForm) {
                            setEditingId(null);
                            setForm({ ...EMPTY_FORM });
                        }
                    }}
                    className="btn-primary self-start"
                >
                    {showForm ? '✕ إلغاء' : '+ إضافة مهمة جديدة'}
                </button>
            </div>

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">
                    {success}
                </div>
            )}

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-6 text-lg">
                        {editingId ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
                    </h2>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm font-medium">
                            ⚠️ {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">
                                    عنوان المهمة <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="مثال: مشاهدة درس جغرافيا الأسبوع"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="input-label">
                                    الصف الدراسي <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="input-field"
                                    required
                                    value={form.grade}
                                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                >
                                    {ACTIVE_GRADES.map((g) => (
                                        <option key={g.value} value={g.value}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="input-label">المادة الدراسية (اختياري)</label>
                                <select
                                    className="input-field"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                >
                                    <option value="">جميع المواد</option>
                                    {SUBJECTS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="input-label">نوع الهدف</label>
                                <select
                                    className="input-field"
                                    value={form.targetType}
                                    onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                                >
                                    {TARGET_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="input-label">النقاط المكتسبة</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input-field"
                                    value={form.points}
                                    onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <label className="input-label">عدد المرات المطلوبة لإتمام الهدف</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="input-field"
                                    value={form.targetCount}
                                    onChange={(e) => setForm({ ...form, targetCount: parseInt(e.target.value) || 1 })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="input-label">وصف تفصيلي للمهمة (اختياري)</label>
                                <textarea
                                    className="input-field min-h-[80px]"
                                    placeholder="اكتب تعليمات المهمة للطالب..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2 mt-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-tawfeek-green/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={form.isPublished}
                                        onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                                        className="w-5 h-5 text-forest border-gray-300 rounded focus:ring-forest"
                                    />
                                    <span className="font-bold text-gray-700">مهمة نشطة (تظهر للطلاب)</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary flex-1 max-w-xs cursor-pointer"
                            >
                                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إنشاء المهمة'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">المهام المضافة</h2>
                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                        {tasks.length} مهمة
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-16 text-gray-400 animate-pulse">جاري التحميل...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">🎯</div>
                        <p className="text-gray-500 font-medium">لا يوجد مهام مضافة حتى الآن</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {tasks.map((t) => (
                            <div
                                key={t._id}
                                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="bg-forest/10 text-forest text-xs font-bold px-2 py-0.5 rounded">
                                            {t.points} نقطة
                                        </span>
                                        <span
                                            className={`text-xs font-bold px-2 py-0.5 rounded ${t.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {t.isPublished ? '✓ نشطة' : 'مخفية'}
                                        </span>
                                    </div>
                                    <div className="font-bold text-gray-900 truncate">{t.title}</div>
                                    {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditClick(t)}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                                    >
                                        تعديل
                                    </button>
                                    <button
                                        onClick={() => handleDelete(t._id, t.title)}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                        حذف
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
