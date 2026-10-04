'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = [
    { value: 'general', label: 'عام' },
    { value: 'lessons', label: 'الحصص' },
    { value: 'exams', label: 'الامتحانات' },
    { value: 'streak', label: 'المداومة' },
    { value: 'points', label: 'النقاط' },
];

const ICONS = ['🏆', '🥇', '🌟', '⚡', '🎓', '🔥', '👑', '🎯', '📚', '🚀'];

const EMPTY_FORM = {
    title: '',
    description: '',
    icon: '🏆',
    category: 'general',
    requiredCount: 1,
    pointsReward: 50,
    badgeColor: '#F59E0B',
    isPublished: true,
};

export default function AdminAchievementsPage() {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadData = () => {
        setLoading(true);
        fetch('/api/admin/achievements')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setAchievements(res.data?.achievements || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            setError('العنوان والوصف مطلوبان');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const url = editingId ? `/api/admin/achievements/${editingId}` : '/api/admin/achievements';
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

            setSuccess(editingId ? 'تم تعديل الإنجاز بنجاح ✅' : 'تمت إضافة الإنجاز بنجاح ✅');
            setShowForm(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (ach: any) => {
        setEditingId(ach._id);
        setForm({
            title: ach.title || '',
            description: ach.description || '',
            icon: ach.icon || '🏆',
            category: ach.category || 'general',
            requiredCount: ach.requiredCount || 1,
            pointsReward: ach.pointsReward || 50,
            badgeColor: ach.badgeColor || '#F59E0B',
            isPublished: ach.isPublished ?? true,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`هل أنت متأكد من حذف الإنجاز «${title}»؟`)) return;
        try {
            const res = await fetch(`/api/admin/achievements/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadData();
                setSuccess('تم حذف الإنجاز بنجاح');
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
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الإنجازات والأوسمة</h1>
                    <p className="text-gray-500 mt-1">إنشاء أوسمة وتحديات تُمنح تلقائياً للطلاب عند التفوق</p>
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
                    {showForm ? '✕ إلغاء' : '+ إضافة إنجاز جديد'}
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
                        {editingId ? 'تعديل الإنجاز' : 'إضافة إنجاز جديد'}
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
                                    اسم الإنجاز <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="مثال: بطل الاختبارات"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="input-label">الفئة</label>
                                <select
                                    className="input-field"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="input-label">الأيقونة</label>
                                <div className="flex gap-2 flex-wrap p-2 bg-gray-50 rounded-xl border border-gray-100">
                                    {ICONS.map((ic) => (
                                        <button
                                            type="button"
                                            key={ic}
                                            onClick={() => setForm({ ...form, icon: ic })}
                                            className={`w-9 h-9 text-lg rounded-lg flex items-center justify-center transition-all ${form.icon === ic ? 'bg-white shadow-md border-2 border-forest scale-110' : 'hover:bg-gray-200'
                                                }`}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="input-label">النقاط المكافأة</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input-field"
                                    value={form.pointsReward}
                                    onChange={(e) => setForm({ ...form, pointsReward: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <label className="input-label">العدد المطلوب لإكمال الإنجاز</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="input-field"
                                    value={form.requiredCount}
                                    onChange={(e) => setForm({ ...form, requiredCount: parseInt(e.target.value) || 1 })}
                                />
                            </div>

                            <div>
                                <label className="input-label">لون الوسام</label>
                                <input
                                    type="color"
                                    className="h-10 w-full rounded-xl cursor-pointer border border-gray-200"
                                    value={form.badgeColor}
                                    onChange={(e) => setForm({ ...form, badgeColor: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="input-label">الوصف والتعليمات</label>
                                <textarea
                                    className="input-field min-h-[80px]"
                                    placeholder="شرح كيفية الحصول على هذا الإنجاز..."
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
                                    <span className="font-bold text-gray-700">إنجاز مفعّل</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="submit" disabled={saving} className="btn-primary flex-1 max-w-xs cursor-pointer">
                                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إنشاء الإنجاز'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 text-center py-16 text-gray-400 animate-pulse">جاري التحميل...</div>
                ) : achievements.length === 0 ? (
                    <div className="col-span-3 text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <div className="text-5xl mb-3">🏆</div>
                        <p className="text-gray-500 font-medium">لا يوجد إنجازات مضافة بعد</p>
                    </div>
                ) : (
                    achievements.map((ach) => (
                        <div key={ach._id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: `${ach.badgeColor}20`, color: ach.badgeColor }}>
                                        {ach.icon || '🏆'}
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ach.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {ach.isPublished ? 'مفعل' : 'معطل'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{ach.title}</h3>
                                <p className="text-xs text-gray-500 mb-4">{ach.description}</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                    <span>🎁 {ach.pointsReward} نقطة</span>
                                    <span className="mr-auto">المطلوب: {ach.requiredCount}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                <button onClick={() => handleEditClick(ach)} className="flex-1 btn-secondary text-xs py-1.5">
                                    تعديل
                                </button>
                                <button onClick={() => handleDelete(ach._id, ach.title)} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl px-3 text-xs py-1.5">
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
