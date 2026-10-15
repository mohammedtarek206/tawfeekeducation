'use client';

import { useEffect, useState, useCallback } from 'react';
import { SUBJECTS, getSubjectLabel } from '@/lib/constants/subjects';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';
import Link from 'next/link';

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

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Filters
    const [filterGrade, setFilterGrade] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        grade: 'first_secondary',
        subject: '',
        difficulty: 'medium',
        lessonRef: '',
    });

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '200' });
        if (filterGrade) params.set('grade', filterGrade);
        if (filterSubject) params.set('subject', filterSubject);
        if (filterDifficulty) params.set('difficulty', filterDifficulty);
        if (search) params.set('search', search);

        fetch(`/api/admin/questions?${params.toString()}`)
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setQuestions(res.data.questions);
                    // Clear selection on reload
                    setSelectedIds(new Set());
                }
            })
            .catch(() => setError('خطأ في تحميل الأسئلة'))
            .finally(() => setLoading(false));
    }, [filterGrade, filterSubject, filterDifficulty, search]);

    useEffect(() => { load(); }, [load]);

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
            setForm({ text: '', options: ['', '', '', ''], correctIndex: 0, grade: 'first_secondary', subject: '', difficulty: 'medium', lessonRef: '' });
            load();
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            setError('حدث خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    // Single delete
    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
        try {
            const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setSuccess('تم حذف السؤال بنجاح ✅');
                setTimeout(() => setSuccess(''), 3000);
                load();
            } else {
                setError(data.message || 'حدث خطأ أثناء الحذف');
                setTimeout(() => setError(''), 5000);
            }
        } catch {
            setError('حدث خطأ في الاتصال بالخادم');
            setTimeout(() => setError(''), 5000);
        }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} سؤال؟ لا يمكن التراجع عن هذه العملية.`)) return;

        setBulkDeleting(true);
        setError('');
        try {
            const res = await fetch('/api/admin/questions/bulk-delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`✅ تم حذف ${data.data.deletedCount} سؤال بنجاح`);
                setTimeout(() => setSuccess(''), 4000);
                load();
            } else {
                setError(data.message || 'حدث خطأ أثناء الحذف الجماعي');
                setTimeout(() => setError(''), 5000);
            }
        } catch {
            setError('حدث خطأ في الاتصال بالخادم');
            setTimeout(() => setError(''), 5000);
        } finally {
            setBulkDeleting(false);
        }
    };

    // Selection helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map((q: any) => q._id)));
        }
    };

    const clearSelection = () => setSelectedIds(new Set());

    const allSelected = questions.length > 0 && selectedIds.size === questions.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < questions.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">بنك الأسئلة</h1>
                    <p className="text-gray-500 mt-1">إدارة الأسئلة المستخدمة في الكويزات والامتحانات</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/admin/questions/import" className="btn-secondary text-sm px-4 py-2 flex items-center gap-1">
                        📥 استيراد
                    </Link>
                    <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                        {showForm ? '✕ إلغاء' : '+ إضافة سؤال'}
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">{success}</div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 font-bold text-sm">{error}</div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 flex-wrap" dir="rtl">
                    <span className="text-red-700 font-bold text-sm">
                        تم تحديد {selectedIds.size} سؤال
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 transition-colors flex items-center gap-2"
                    >
                        {bulkDeleting ? (
                            <>
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                جاري الحذف...
                            </>
                        ) : (
                            <>🗑️ حذف المحدد ({selectedIds.size})</>
                        )}
                    </button>
                    <button
                        onClick={clearSelection}
                        className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                    >
                        ✕ إلغاء التحديد
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center" dir="rtl">
                <input
                    type="text"
                    placeholder="🔍 بحث في الأسئلة..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white min-w-[180px]"
                />
                <select
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                    <option value="">كل الصفوف</option>
                    {ACTIVE_GRADES.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                </select>
                <select
                    value={filterSubject}
                    onChange={e => setFilterSubject(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                    <option value="">كل المواد</option>
                    {SUBJECTS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
                <select
                    value={filterDifficulty}
                    onChange={e => setFilterDifficulty(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                    <option value="">كل المستويات</option>
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                </select>
            </div>

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
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        {/* Select All Checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => {
                                        if (el) el.indeterminate = someSelected;
                                    }}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 accent-red-600 cursor-pointer"
                                />
                            </div>
                            <span className="text-sm font-bold text-gray-600">
                                {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                            </span>
                        </label>
                        <h2 className="font-bold text-gray-900">الأسئلة المضافة</h2>
                    </div>
                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                        {questions.length} سؤال
                    </span>
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
                        {questions.map((q: any, i: number) => {
                            const isSelected = selectedIds.has(q._id);
                            return (
                                <div
                                    key={q._id}
                                    className={`px-6 py-4 transition-colors ${isSelected ? 'bg-red-50/60' : 'hover:bg-gray-50/50'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox */}
                                        <div className="pt-1 flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(q._id)}
                                                className="w-4 h-4 accent-red-600 cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex gap-2 items-center mb-1 flex-wrap">
                                                <span className="px-2 py-0.5 rounded bg-forest text-white text-[10px] font-bold shadow-sm">
                                                    {getSubjectLabel(q.subject)}
                                                </span>
                                                <span className="bg-tawfeek-primary/10 text-tawfeek-primary text-[10px] font-bold px-2 py-0.5 rounded">
                                                    {gradeLabel(q.grade)}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${DIFF_COLORS[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                                                    {DIFF_LABELS[q.difficulty] || q.difficulty}
                                                </span>
                                                <span className="text-gray-400 text-xs font-medium">
                                                    {q.type === 'mcq' ? 'اختيار متعدد' : 'صح/خطأ'}
                                                </span>
                                            </div>
                                            <p className="font-medium text-gray-900 mb-3">
                                                <span className="text-gray-400 text-sm ml-2">({i + 1})</span>
                                                {q.text}
                                            </p>
                                            {q.choices && q.choices.length > 0 && (
                                                <div className="grid grid-cols-2 gap-1 mb-1">
                                                    {q.choices.map((opt: any, oi: number) => (
                                                        <div
                                                            key={oi}
                                                            className={`text-sm px-3 py-1.5 rounded-lg ${opt.isCorrect
                                                                ? 'bg-green-100 text-green-800 font-bold'
                                                                : 'bg-gray-50 text-gray-600'
                                                                }`}
                                                        >
                                                            {opt.isCorrect ? '✓ ' : ''}{opt.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Single Delete */}
                                        <button
                                            onClick={() => handleDelete(q._id)}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0"
                                            title="حذف السؤال"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
