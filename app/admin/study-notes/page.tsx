'use client';
import { useEffect, useState } from 'react';
import { getSubjectLabel, SUBJECTS } from '@/lib/constants/subjects';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';


export default function StudyNotesAdminPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        title: '',
        driveUrl: '',
        grade: 'first_secondary',
        subject: '',
        description: '',
        isPublished: true,
    });

    const load = () => {
        setLoading(true);
        fetch('/api/admin/study-notes')
            .then(r => r.json())
            .then(res => { if (res.success) setNotes(res.data?.notes || []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.driveUrl.trim()) { setError('العنوان والرابط مطلوبان'); return; }
        if (!form.subject) { setError('المادة الدراسية مطلوبة'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/admin/study-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) { setError(data.message || 'حدث خطأ'); return; }
            setSuccess('تم إنشاء المذكرة بنجاح ✅');
            setShowForm(false);
            setForm({ title: '', driveUrl: '', grade: 'first_secondary', subject: '', description: '', isPublished: true });
            load();
            setTimeout(() => setSuccess(''), 3000);
        } catch { setError('حدث خطأ'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`هل أنت متأكد من حذف المذكرة «${title}»؟`)) return;
        try {
            const res = await fetch(`/api/admin/study-notes/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setSuccess('تم حذف المذكرة بنجاح');
                load();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                alert(data.message || 'خطأ في الحذف');
            }
        } catch {
            alert('حدث خطأ بالخادم');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">مذكرات سؤال وجواب</h1>
                    <p className="text-gray-500 mt-1">إضافة ومشاركة روابط جوجل درايف الخاصة بالمذكرات</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary self-start">
                    {showForm ? '✕ إلغاء' : '+ إضافة مذكرة جديدة'}
                </button>
            </div>

            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">{success}</div>}

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                    <h2 className="font-bold text-gray-900 mb-6 text-lg">إضافة مذكرة جديدة</h2>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">عنوان المذكرة</label>
                                <input type="text" className="input-field" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="input-label">رابط Google Drive</label>
                                <input type="url" className="input-field" placeholder="https://drive.google.com/..." required value={form.driveUrl} onChange={e => setForm({ ...form, driveUrl: e.target.value })} />
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
                                <label className="input-label">الصف الدراسي</label>
                                <select className="input-field" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                                    {ACTIVE_GRADES.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="input-label">وصف قصير (اختياري)</label>
                                <input type="text" className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 mt-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-tawfeek-green/50 transition-colors">
                                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="w-5 h-5 text-forest border-gray-300 rounded focus:ring-forest" />
                                    <span className="font-bold text-gray-700">ميزة النشر (تظهر للطلاب إذا كانت مُفعلة)</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="submit" disabled={saving} className="btn-primary flex-1 max-w-xs cursor-pointer hover:-translate-y-0.5">
                                {saving ? 'جاري الحفظ...' : 'حفظ المذكرة'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">المذكرات المضافة</h2>
                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{notes.length} مذكرة</span>
                </div>
                {loading ? (
                    <div className="text-center py-16 text-gray-400 animate-pulse">جاري التحميل...</div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-16"><div className="text-5xl mb-3">📚</div><p className="text-gray-500">لا يوجد مذكرات مضافة حتى الآن</p></div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notes.map((note: any) => (
                            <div key={note._id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded bg-forest text-white text-[10px] font-bold shadow-sm">
                                            {getSubjectLabel(note.subject)}
                                        </span>
                                        <div className="font-bold text-gray-900">{note.title}</div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="bg-tawfeek-primary/10 text-tawfeek-primary text-xs font-bold px-2 py-0.5 rounded">{gradeLabel(note.grade)}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${note.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {note.isPublished ? '✓ منشور' : 'مسودة'}
                                        </span>
                                        <a href={note.driveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">فتح الرابط ↗</a>
                                    </div>
                                    {note.description && <p className="text-xs text-gray-500 mt-2">{note.description}</p>}
                                </div>
                                <button
                                    onClick={() => handleDelete(note._id, note.title)}
                                    className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold border border-red-200 transition-colors shrink-0"
                                    title="حذف المذكرة"
                                >
                                    🗑 حذف
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
