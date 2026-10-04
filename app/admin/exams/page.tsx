'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SUBJECTS, getSubjectLabel } from '@/lib/constants/subjects';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';



const SUBJECT_LABELS: Record<string, string> = {
    history: 'التاريخ',
    geography: 'الجغرافيا',
    social_studies: 'الدراسات الاجتماعية',
};

const TYPE_LABELS: Record<string, string> = {
    quiz: 'كويز حصة',
    weekly: 'امتحان أسبوعي',
    monthly: 'امتحان شهري',
};
const TYPE_COLORS: Record<string, string> = {
    quiz: 'bg-blue-100 text-blue-700',
    weekly: 'bg-purple-100 text-purple-700',
    monthly: 'bg-orange-100 text-orange-700',
};

const EMPTY_FORM = {
    title: '',
    type: 'weekly',
    grade: 'first_secondary',
    subject: '',
    duration: 60,
    passingScore: 50,
    description: '',
    lessonId: '',      // ← فقط لمعرّف الحصة من DB
    isPublished: true, // Default to published
};

export default function AdminExamsPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);   // ← الحصص المنشورة
    const [loading, setLoading] = useState(true);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState<string | null>(null);

    /* ───── تحميل الامتحانات ───── */
    const loadExams = () => {
        setLoading(true);
        fetch('/api/admin/exams')
            .then(r => r.json())
            .then(res => { if (res.success) setExams(res.data?.exams || []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    /* ───── تحميل الحصص عند فتح الفورم ───── */
    const loadLessons = () => {
        setLoadingLessons(true);
        fetch('/api/admin/lessons?limit=200')
            .then(r => r.json())
            .then(res => {
                if (res.success) setLessons(res.data?.lessons || []);
            })
            .catch(() => { })
            .finally(() => setLoadingLessons(false));
    };

    useEffect(() => { loadExams(); }, []);

    /* ───── فتح/إغلاق الفورم ───── */
    const toggleForm = () => {
        const next = !showForm;
        setShowForm(next);
        if (next) {
            setForm({ ...EMPTY_FORM });
            setEditingId(null);
            setError('');
            loadLessons();     // جلب الحصص عند الفتح
        } else {
            setEditingId(null);
        }
    };

    /* ───── تغيير النوع → مسح lessonId إذا لم يكن quiz ───── */
    const handleTypeChange = (type: string) => {
        setForm(prev => ({
            ...prev,
            type,
            lessonId: type === 'quiz' ? prev.lessonId : '',
        }));
    };

    /* ───── إرسال الفورم ───── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation Frontend
        if (!form.title.trim()) { setError('عنوان الامتحان مطلوب'); return; }
        if (!form.subject) { setError('يجب اختيار المادة الدراسية'); return; }
        if (form.type === 'quiz' && !form.lessonId) {
            setError('يجب اختيار الحصة المرتبطة بكويز الحصة');
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, any> = {
                title: form.title.trim(),
                type: form.type,
                grade: form.grade,
                subject: form.subject,
                duration: Number(form.duration),
                passingScore: Number(form.passingScore),
                description: form.description || undefined,
                isPublished: form.isPublished,
            };

            // lessonId فقط عند نوع quiz ولا يُرسل روابط فيديو أبدًا
            if (form.type === 'quiz' && form.lessonId) {
                payload.lessonId = form.lessonId;
            } else {
                payload.lessonId = null;
            }

            let res: Response;
            if (editingId) {
                // وضع التعديل
                res = await fetch(`/api/admin/exams/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                // إنشاء جديد
                res = await fetch('/api/admin/exams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }
            const data = await res.json();

            if (!data.success) {
                setError(data.message || 'تعذّر حفظ البيانات، تحقق من البيانات المدخلة.');
                return;
            }

            const typeLabel = TYPE_LABELS[form.type] || 'الاختبار';
            setSuccess(editingId ? `تم تعديل ${typeLabel} بنجاح ✅` : `تم إنشاء ${typeLabel} بنجاح ✅`);
            setShowForm(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
            loadExams();
            setTimeout(() => setSuccess(''), 4000);
        } catch {
            setError('خطأ في الاتصال بالخادم، حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    /* ───── مساعد: اسم الحصة في الـ Dropdown ───── */
    const getLessonLabel = (lesson: any) => {
        const subject = SUBJECT_LABELS[lesson.subject] || lesson.subject || '';
        return `${subject} — ${lesson.title}`;
    };

    /* ───── تبديل النشر / الإيقاف ───── */
    const togglePublish = async (examId: string, current: boolean) => {
        try {
            const res = await fetch(`/api/admin/exams/${examId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !current }),
            });
            const data = await res.json();
            if (data.success) {
                setExams(prev => prev.map(ex => ex._id === examId ? { ...ex, isPublished: !current } : ex));
                setSuccess(!current ? '✅ تم نشر الامتحان وبات ظاهراً للطلاب' : 'تم إيقاف نشر الامتحان (مسودة)');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                alert(data.message || 'حدث خطأ');
            }
        } catch {
            alert('خطأ في الاتصال');
        }
    };

    /* ───── حذف الامتحان ───── */
    const deleteExam = async (examId: string, title: string) => {
        if (!confirm(`هل أنت متأكد من حذف «${title}»؟`)) return;
        try {
            const res = await fetch(`/api/admin/exams/${examId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setExams(prev => prev.filter(ex => ex._id !== examId));
                setSuccess('تم حذف الامتحان بنجاح');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                alert(data.message || 'حدث خطأ في الحذف');
            }
        } catch {
            alert('خطأ في الاتصال');
        }
    };

    /* ───── فتح الفورم في وضع التعديل ───── */
    const handleEditClick = (ex: any) => {
        setEditingId(ex._id);
        setForm({
            title: ex.title || '',
            type: ex.type || 'weekly',
            grade: ex.grade || 'first_secondary',
            subject: ex.subject || '',
            duration: ex.duration || 60,
            passingScore: ex.passingScore || 50,
            description: ex.description || '',
            lessonId: ex.lessonId?.toString() || '',
            isPublished: ex.isPublished ?? true,
        });
        setError('');
        setShowForm(true);
        loadLessons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ─────────────── UI ─────────────── */
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الامتحانات والكويزات</h1>
                    <p className="text-gray-500 mt-1">إنشاء وإدارة امتحانات أسبوعية وشهرية وكويزات الحصص</p>
                </div>
                <button onClick={toggleForm} className="btn-primary self-start">
                    {showForm ? '✕ إلغاء' : '+ إنشاء امتحان'}
                </button>
            </div>

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">
                    {success}
                </div>
            )}

            {/* ── FORM ── */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-1 text-lg">
                        {editingId
                            ? `تعديل ${TYPE_LABELS[form.type] || 'الامتحان'}`
                            : form.type === 'quiz'
                                ? 'إنشاء كويز حصة'
                                : form.type === 'weekly'
                                    ? 'إنشاء امتحان أسبوعي'
                                    : 'إنشاء امتحان شهري'}
                    </h2>
                    <p className="text-xs text-gray-400 mb-6">
                        {editingId
                            ? 'عدّل بيانات الامتحان ثم اضغط حفظ'
                            : form.type === 'quiz'
                                ? 'اختر الحصة التي سيُربط بها هذا الكويز'
                                : 'حدد تفاصيل الامتحان ثم اضغط إنشاء'}
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm font-medium">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Row 1: العنوان + النوع */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">
                                    عنوان الامتحان <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder={
                                        form.type === 'quiz'
                                            ? 'مثال: كويز الدرس الأول — موقع مصر'
                                            : form.type === 'weekly'
                                                ? 'مثال: امتحان أسبوعي — الأسبوع الأول'
                                                : 'مثال: امتحان شهري — شهر أكتوبر'
                                    }
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="input-label">نوع الامتحان <span className="text-red-500">*</span></label>
                                <select
                                    className="input-field"
                                    value={form.type}
                                    onChange={e => handleTypeChange(e.target.value)}
                                >
                                    <option value="quiz">🎯 كويز حصة</option>
                                    <option value="weekly">📅 امتحان أسبوعي</option>
                                    <option value="monthly">📊 امتحان شهري</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2: الصف + المادة */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">الصف الدراسي <span className="text-red-500">*</span></label>
                                <select
                                    className="input-field"
                                    value={form.grade}
                                    onChange={e => setForm({ ...form, grade: e.target.value })}
                                >
                                    {ACTIVE_GRADES.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="input-label">
                                    المادة الدراسية <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="input-field"
                                    required
                                    value={form.subject}
                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                >
                                    <option value="" disabled>اختر المادة</option>
                                    {SUBJECTS.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ── حقل الحصة — يظهر فقط عند quiz ── */}
                        {form.type === 'quiz' && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                                <label className="input-label text-blue-800">
                                    الحصة المرتبطة <span className="text-red-500">*</span>
                                </label>
                                {loadingLessons ? (
                                    <div className="text-sm text-blue-500 animate-pulse py-2">جاري تحميل الحصص...</div>
                                ) : (
                                    <select
                                        className="input-field bg-white"
                                        value={form.lessonId}
                                        onChange={e => setForm({ ...form, lessonId: e.target.value })}
                                        required={form.type === 'quiz'}
                                    >
                                        <option value="" disabled>— اختر الحصة —</option>
                                        {lessons.length === 0 && (
                                            <option disabled>لا يوجد حصص منشورة حاليًا</option>
                                        )}
                                        {lessons
                                            .sort((a, b) => {
                                                // ترتيب: المادة أولاً ثم رقم الحصة
                                                if (a.subject !== b.subject)
                                                    return (a.subject || '').localeCompare(b.subject || '');
                                                return (a.lessonNumber || 0) - (b.lessonNumber || 0);
                                            })
                                            .map((lesson: any) => (
                                                <option key={lesson._id} value={lesson._id}>
                                                    {getLessonLabel(lesson)}
                                                </option>
                                            ))}
                                    </select>
                                )}
                                <p className="text-xs text-blue-500">
                                    سيتم ربط هذا الكويز تلقائيًا بالحصة المختارة.
                                    <br />
                                    يظهر للطلاب داخل صفحة تلك الحصة فقط.
                                </p>
                            </div>
                        )}

                        {/* Row 3: المدة + درجة النجاح */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">المدة (بالدقائق)</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="input-field"
                                    value={form.duration}
                                    onChange={e => setForm({ ...form, duration: +e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="input-label">درجة النجاح</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    className="input-field"
                                    value={form.passingScore}
                                    onChange={e => setForm({ ...form, passingScore: +e.target.value })}
                                />
                            </div>
                        </div>

                        {/* الوصف */}
                        <div>
                            <label className="input-label">
                                وصف الامتحان <span className="text-gray-400 font-normal">(اختياري)</span>
                            </label>
                            <textarea
                                rows={2}
                                className="input-field resize-none"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="وصف مختصر..."
                            />
                        </div>

                        <div className="md:col-span-2 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-tawfeek-green/50 transition-colors">
                                <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="w-5 h-5 text-forest border-gray-300 rounded focus:ring-forest" />
                                <span className="font-bold text-gray-700">ميزة النشر (تظهر للطلاب إذا كانت مُفعلة)</span>
                            </label>
                        </div>

                        {/* أزرار الإجراء */}
                        <div className="flex gap-3 pt-2 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary flex-1 disabled:opacity-60"
                            >
                                {saving ? 'جاري الحفظ...' : editingId ? `حفظ التعديلات` : `إنشاء ${TYPE_LABELS[form.type] || 'الامتحان'}`}
                            </button>
                            <button
                                type="button"
                                onClick={toggleForm}
                                className="btn-secondary flex-1"
                            >
                                إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── قائمة الامتحانات ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">الامتحانات المنشأة</h2>
                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                        {exams.length} امتحان
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-16 text-gray-400 animate-pulse">جاري التحميل...</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">📊</div>
                        <p className="text-gray-500">لا يوجد امتحانات مضافة حتى الآن</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {exams.map((ex: any) => (
                            <div key={ex._id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 rounded bg-forest text-white text-[10px] font-bold shadow-sm">
                                            {getSubjectLabel(ex.subject)}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_COLORS[ex.type] || 'bg-gray-100 text-gray-600'}`}>
                                            {TYPE_LABELS[ex.type] || ex.type}
                                        </span>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">
                                            {gradeLabel(ex.grade)}
                                        </span>
                                    </div>
                                    <div className="font-bold text-gray-900 truncate">{ex.title}</div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                        <span>⏱ {ex.duration} دقيقة</span>
                                        <span>النجاح: {ex.passingScore}%</span>
                                        {ex.lessonId && (
                                            <span className="text-blue-500 font-medium">🔗 مرتبط بحصة</span>
                                        )}
                                        <span className="text-forest font-bold">📝 {ex.questions?.length || 0} سؤال</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/admin/exams/${ex._id}/preview`} className="btn-secondary py-1.5 px-3 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 font-bold">
                                        معاينة
                                    </Link>
                                    <Link href={`/admin/exams/${ex._id}/questions`} className="btn-secondary py-1.5 px-3 text-xs bg-forest/5 hover:bg-forest/10 border-forest/20 text-forest font-bold">
                                        إدارة الأسئلة
                                    </Link>
                                    <button
                                        onClick={() => handleEditClick(ex)}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer flex-shrink-0"
                                        title="تعديل بيانات الامتحان"
                                    >
                                        <span suppressHydrationWarning>✏️</span> تعديل
                                    </button>
                                    <button
                                        onClick={() => togglePublish(ex._id, ex.isPublished)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 border transition-colors cursor-pointer ${ex.isPublished
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-forest/10 hover:text-forest hover:border-forest/30'
                                            }`}
                                    >
                                        {ex.isPublished ? '✓ منشور — إيقاف' : <><span suppressHydrationWarning>▶</span> نشر للطلاب</>}
                                    </button>
                                    <button
                                        onClick={() => deleteExam(ex._id, ex.title)}
                                        className="text-xs font-bold px-2 py-1.5 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors cursor-pointer flex-shrink-0"
                                        title="حذف"
                                    >
                                        <span suppressHydrationWarning>🗑</span>
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
