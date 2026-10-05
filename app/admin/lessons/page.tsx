'use client';
import { useEffect, useState } from 'react';
import { ACTIVE_GRADES, gradeShort } from '@/lib/constants/grades';

// الجغرافيا مؤرشفة — لا تظهر للمحتوى الجديد
const SUBJECTS = [
    { value: 'history', label: 'التاريخ' },
    { value: 'social_studies', label: 'الدراسات الاجتماعية' },
];

const EMPTY_FORM = {
    title: '',
    lessonNumber: 1,
    unit: 'الوحدة الأولى',
    grade: 'first_secondary',
    subject: '',
    youtubeUrl: '',
    thumbnail: '',
    description: '',
    duration: 0,
    order: 1,
    isPublished: true,
    isFree: false,
    showOnHomepage: false,
};

export default function AdminLessonsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [filterSubject, setFilterSubject] = useState<string>('all');
    const [filterGrade, setFilterGrade] = useState<string>('all');

    const [form, setForm] = useState({ ...EMPTY_FORM });

    const loadData = () => {
        setLoading(true);
        fetch(`/api/admin/lessons`)
            .then((r) => r.json())
            .then((res) => { if (res.success) setData(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const handleEditClick = (lesson: any) => {
        setEditingId(lesson._id);
        setForm({
            title: lesson.title,
            lessonNumber: lesson.lessonNumber || 1,
            unit: lesson.unit,
            grade: lesson.grade || 'first_secondary',
            subject: lesson.subject && lesson.subject !== 'uncategorized' && lesson.subject !== 'رياضيات' ? lesson.subject : '',
            youtubeUrl: lesson.youtubeUrl || '',
            thumbnail: lesson.thumbnail || '',
            description: lesson.description || '',
            duration: lesson.duration || 0,
            order: lesson.order || lesson.lessonNumber || 1,
            isPublished: lesson.isPublished,
            isFree: lesson.isFree || false,
            showOnHomepage: lesson.showOnHomepage || false,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
        try {
            const res = await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) loadData();
            else alert(result.message || 'خطأ في الحذف');
        } catch { alert('خطأ في الاتصال'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('اسم الحصة مطلوب'); return; }
        if (!form.subject) { setError('المادة الدراسية مطلوبة'); return; }
        if (!form.grade) { setError('الصف الدراسي مطلوب'); return; }

        setSaving(true);
        setError('');

        const url = editingId ? `/api/admin/lessons/${editingId}` : '/api/admin/lessons';
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    lessonNumber: Number(form.lessonNumber),
                    unit: form.unit,
                    subject: form.subject,
                    grade: form.grade,
                    youtubeUrl: form.youtubeUrl || undefined,
                    thumbnail: form.thumbnail || undefined,
                    description: form.description || undefined,
                    duration: Number(form.duration) || undefined,
                    order: Number(form.order) || 1,
                    isPublished: form.isPublished,
                    isFree: form.isFree,
                    showOnHomepage: form.showOnHomepage,
                    points: 10,
                }),
            });
            const result = await res.json();
            if (!result.success) { setError(result.message || 'خطأ في الحفظ'); return; }

            setSuccess(editingId ? 'تم التعديل بنجاح ✓' : 'تمت الإضافة بنجاح ✓');
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

    const displayedLessons = data?.lessons?.filter((lesson: any) => {
        if (filterSubject !== 'all' && lesson.subject !== filterSubject) return false;
        if (filterGrade !== 'all' && lesson.grade !== filterGrade) return false;
        return true;
    }) || [];

    const getSubjectLabel = (val: string) => SUBJECTS.find(s => s.value === val)?.label || 'غير مصنف';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الحصص التعليمية</h1>
                    <p className="text-gray-500 mt-1">إضافة، تعديل أو نشر المحتوى التعليمي</p>
                </div>
                <button onClick={() => {
                    setShowForm(!showForm);
                    if (!showForm) { setEditingId(null); setForm({ ...EMPTY_FORM }); }
                }} className="btn-primary self-start">
                    {showForm ? '✕ إلغاء' : '+ إضافة حصة جديدة'}
                </button>
            </div>

            {/* Filters */}
            {!showForm && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-bold text-gray-500 mb-1 block">فلترة حسب الصف</label>
                        <select className="input-field" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                            <option value="all">كل الصفوف</option>
                            {ACTIVE_GRADES.map(g => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-bold text-gray-500 mb-1 block">فلترة حسب المادة</label>
                        <select className="input-field" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                            <option value="all">كل المواد</option>
                            {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">{success}</div>}

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                    <h2 className="font-bold text-gray-900 mb-6 text-lg">{editingId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">عنوان الحصة <span className="text-red-500">*</span></label>
                                <input type="text" className="input-field" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="input-label">رابط الفيديو (YouTube / Drive / MP4)</label>
                                <input type="url" className="input-field" placeholder="https://..." value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })} />
                            </div>
                            <div>
                                <label className="input-label">الوحدة</label>
                                <input type="text" className="input-field" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                            </div>
                            <div>
                                <label className="input-label">رقم الحصة في الوحدة</label>
                                <input type="number" min="1" className="input-field" required value={form.lessonNumber} onChange={e => setForm({ ...form, lessonNumber: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div>
                                <label className="input-label">الصف الدراسي <span className="text-red-500">*</span></label>
                                <select className="input-field" required value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                                    <option value="">اختر الصف</option>
                                    {ACTIVE_GRADES.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">المادة الدراسية <span className="text-red-500">*</span></label>
                                <select className="input-field" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                                    <option value="" disabled>اختر المادة</option>
                                    {SUBJECTS.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">رابط صورة الغلاف (اختياري)</label>
                                <input type="url" className="input-field" placeholder="https://..." value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} />
                            </div>
                            <div>
                                <label className="input-label">مدة الحصة (بالدقائق)</label>
                                <input type="number" min="0" className="input-field" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="input-label">ترتيب العرض</label>
                                <input type="number" min="1" className="input-field" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="input-label">وصف مختصر للحصة (اختياري)</label>
                                <textarea className="input-field min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 border-t border-gray-100 pt-3">
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-tawfeek-green/50 transition-colors">
                                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="w-5 h-5 text-tawfeek-green border-gray-300 rounded focus:ring-tawfeek-green" />
                                    <span className="font-bold text-gray-700 text-sm">منشور (يظهر للطلاب)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-tawfeek-green/50 transition-colors">
                                    <input type="checkbox" checked={form.isFree} onChange={e => setForm({ ...form, isFree: e.target.checked })} className="w-5 h-5 text-tawfeek-green border-gray-300 rounded" />
                                    <span className="font-bold text-gray-700 text-sm">مجاني (بدون اشتراك)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-tawfeek-green/50 transition-colors">
                                    <input type="checkbox" checked={form.showOnHomepage} onChange={e => setForm({ ...form, showOnHomepage: e.target.checked })} className="w-5 h-5 text-tawfeek-green border-gray-300 rounded" />
                                    <span className="font-bold text-gray-700 text-sm">عرض في الصفحة الرئيسية</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="submit" disabled={saving} className={`btn-primary flex-1 max-w-xs cursor-pointer hover:-translate-y-0.5 ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : ''}`}>
                                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ الحصة'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 text-center py-20 text-gray-500 animate-pulse">جاري التحميل...</div>
                ) : displayedLessons.length === 0 ? (
                    <div className="col-span-3 text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="text-4xl mb-3">🎬</div>
                        <p className="text-gray-500 font-bold">لا يوجد حصص مطابقة</p>
                    </div>
                ) : (
                    displayedLessons.map((lesson: any) => (
                        <div key={lesson._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group relative">
                            <div className="absolute top-2 left-2 z-10 flex gap-2">
                                <span className="px-3 py-1 rounded bg-forest/90 backdrop-blur text-xs font-bold text-white shadow-sm">
                                    {getSubjectLabel(lesson.subject)}
                                </span>
                            </div>
                            <div className="h-40 bg-gray-100 relative">
                                {lesson.youtubeId ? (
                                    <iframe src={`https://www.youtube.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`} className="w-full h-full border-0" allowFullScreen />
                                ) : lesson.thumbnail ? (
                                    <img src={lesson.thumbnail} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                                )}
                                <div className="absolute bottom-2 right-2 flex gap-1 flex-wrap pointer-events-none">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm ${lesson.isPublished ? 'bg-tawfeek-green' : 'bg-gray-500'}`}>
                                        {lesson.isPublished ? 'منشور' : 'مسودة'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/90 text-gray-900 shadow-sm">
                                        {gradeShort(lesson.grade)}
                                    </span>
                                    {lesson.isFree && <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-white">مجاني</span>}
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col pt-5">
                                <div className="text-xs text-tawfeek-green font-bold mb-1">الوحدة: {lesson.unit} (الدرس {lesson.lessonNumber})</div>
                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{lesson.title}</h3>
                                <div className="mt-auto pt-4 flex gap-2 border-t border-gray-100">
                                    <button onClick={() => handleEditClick(lesson)} className="btn-secondary btn-sm flex-1 text-center py-1.5 hover:bg-tawfeek-green hover:text-white transition-colors">
                                        تعديل
                                    </button>
                                    <button onClick={() => handleDeleteClick(lesson._id)} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl px-3 flex-shrink-0 transition-colors py-1.5">
                                        حذف
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
