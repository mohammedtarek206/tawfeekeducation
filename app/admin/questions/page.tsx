'use client';

import { useEffect, useState } from 'react';
import { SUBJECTS, getSubjectLabel } from '@/lib/constants/subjects';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';


const DIFF_LABELS: Record<string, string> = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
};

const DIFF_COLORS: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
};

export default function AdminQuestionsPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        grade: 'third_preparatory',
        subject: '',
        difficulty: 'medium',
        lessonRef: '',
    });

    const load = () => {
        setLoading(true);
        fetch('/api/admin/questions')
            .then(r => r.json())
            .then(res => { if (res.success) setQuestions(res.data.questions); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleOptionChange = (i: number, val: string) => {
        const opts = [...form.options];
        opts[i] = val;
        setForm({ ...form, options: opts });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.text.trim() || form.options.some(o => !o.trim())) {
            setError('يرجى ملء جميع الحقول');
            return;
        }
        if (!form.subject) {
            setError('يجب تحديد المادة الدراسية');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/admin/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: form.text,
                    type: 'mcq',
                    choices: form.options.map((text, i) => ({ text, isCorrect: i === form.correctIndex })),
                    subject: form.subject,
                    grade: form.grade,
                    difficulty: form.difficulty,
                    lesson: form.lessonRef || undefined,
                }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.message || 'حدث خطأ'); return; }
            setSuccess('تم إضافة السؤال بنجاح ✅');
            setShowForm(false);
            setForm({ text: '', options: ['', '', '', ''], correctIndex: 0, grade: 'third_preparatory', subject: '', difficulty: 'medium', lessonRef: '' });
            load();
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('حدث خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
        await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
        load();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">بنك الأسئلة</h1>
                    <p className="text-gray-500 mt-1">إدارة الأسئلة المستخدمة في الكويزات والامتحانات</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary self-start">
                    {showForm ? '✕ إلغاء' : '+ إضافة سؤال'}
                </button>
            </div>

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">{success}</div>
            )}

            {/* Add Question Form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-6 text-lg">إضافة سؤال جديد</h2>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="input-label">نص السؤال</label>
                                <textarea
                                    rows={3}
                                    className="input-field resize-none"
                                    placeholder="اكتب السؤال هنا..."
                                    value={form.text}
                                    onChange={e => setForm({ ...form, text: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="input-label mb-3">الخيارات (اختر الإجابة الصحيحة)</label>
                                <div className="space-y-3">
                                    {form.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="correct"
                                                id={`opt-${i}`}
                                                checked={form.correctIndex === i}
                                                onChange={() => setForm({ ...form, correctIndex: i })}
                                                className="accent-tawfeek-primary w-5 h-5 flex-shrink-0 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                placeholder={`الخيار ${i + 1}`}
                                                value={opt}
                                                onChange={e => handleOptionChange(i, e.target.value)}
                                                className={`input-field flex-1 ${form.correctIndex === i ? 'border-tawfeek-green ring-1 ring-tawfeek-green bg-green-50/50' : 'bg-white'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
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

                            <div>
                                <label className="input-label">مستوى الصعوبة</label>
                                <select className="input-field" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                                    <option value="easy">سهل</option>
                                    <option value="medium">متوسط</option>
                                    <option value="hard">صعب</option>
                                </select>
                            </div>

                            <div>
                                <label className="input-label">رقم / مرجع الحصة <span className="text-gray-400 font-normal">(اختياري)</span></label>
                                <input type="text" className="input-field" placeholder="مثال: L01" value={form.lessonRef} onChange={e => setForm({ ...form, lessonRef: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving} className="btn-primary flex-1 max-w-xs">
                                {saving ? 'جاري الحفظ...' : 'حفظ السؤال'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-6">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Questions List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">الأسئلة المضافة</h2>
                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{questions.length} سؤال</span>
                </div>
                {loading ? (
                    <div className="text-center py-16 text-gray-400 animate-pulse">جاري التحميل...</div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">📝</div>
                        <p className="text-gray-500 font-medium">لا يوجد أسئلة مضافة حتى الآن</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {questions.map((q: any, i: number) => (
                            <div key={q._id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex gap-2 items-center mb-1">
                                            <span className="px-2 py-0.5 rounded bg-forest text-white text-[10px] font-bold shadow-sm">
                                                {getSubjectLabel(q.subject)}
                                            </span>
                                            <span className="bg-tawfeek-primary/10 text-tawfeek-primary text-[10px] font-bold px-2 py-0.5 rounded">
                                                {gradeLabel(q.grade)}
                                            </span>
                                        </div>
                                        <p className="font-medium text-gray-900 mb-3">
                                            <span className="text-gray-400 text-sm ml-2">({i + 1})</span>
                                            {q.text}
                                        </p>
                                        <div className="grid grid-cols-2 gap-1 mb-3">
                                            {q.options?.map((opt: any, oi: number) => (
                                                <div key={oi} className={`text-sm px-3 py-1.5 rounded-lg ${opt.isCorrect ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-50 text-gray-600'}`}>
                                                    {opt.isCorrect ? '✓ ' : ''}{opt.text}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${DIFF_COLORS[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>{DIFF_LABELS[q.difficulty] || q.difficulty}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(q._id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0" title="حذف السؤال">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
