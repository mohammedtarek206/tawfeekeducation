'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const EMPTY_CHOICE = { text: '', isCorrect: false };

export default function AdminExamQuestionsPage() {
    const { id: examId } = useParams();
    const router = useRouter();

    const [exam, setExam] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState<any>({
        _id: '',
        text: '',
        type: 'mcq', // mcq | true_false
        points: 1,
        choices: [{ ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }],
        correctAnswer: '',
        explanation: '',
        image: ''
    });

    const loadData = () => {
        setLoading(true);
        fetch(`/api/admin/exams/${examId}/questions`)
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setExam(res.data.exam);
                    setQuestions(res.data.questions);
                } else {
                    setError(res.message);
                }
            })
            .catch(() => setError('فشل الاتصال بالخادم'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (examId) loadData();
    }, [examId]);

    const openFormForAdd = () => {
        setForm({
            _id: '',
            text: '',
            type: 'mcq',
            points: 1,
            choices: [{ ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }],
            correctAnswer: '',
            explanation: '',
            image: ''
        });
        setError('');
        setShowForm(true);
        scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openFormForEdit = (q: any) => {
        setForm({
            _id: q._id,
            text: q.text,
            type: q.type,
            points: q.points,
            choices: q.type === 'mcq' ? (q.choices?.length ? q.choices : [{ ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }, { ...EMPTY_CHOICE }]) : [],
            correctAnswer: q.type === 'true_false'
                ? (q.choices?.find((c: any) => c.isCorrect)?.text === 'صح' ? 'true' : 'false')
                : '',
            explanation: q.explanation || '',
            image: q.image || ''
        });

        if (q.type === 'mcq') {
            // Find correct choice index and set it up to easily manage from UI if needed,
            // but we'll use choices[i].isCorrect directly in state.
        }

        setError('');
        setShowForm(true);
        scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChoiceChange = (index: number, text: string) => {
        const newChoices = [...form.choices];
        newChoices[index].text = text;
        setForm({ ...form, choices: newChoices });
    };

    const handleCorrectChoice = (index: number) => {
        const newChoices = form.choices.map((c: any, i: number) => ({
            ...c,
            isCorrect: i === index
        }));
        setForm({ ...form, choices: newChoices });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        const url = form._id
            ? `/api/admin/exams/${examId}/questions/${form._id}`
            : `/api/admin/exams/${examId}/questions`;
        const method = form._id ? 'PUT' : 'POST';

        const payload = { ...form };
        if (form.type === 'mcq') {
            payload.choices = form.choices.filter((c: any) => c.text.trim() !== '');
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!data.success) {
                setError(data.message || 'حدث خطأ أثناء الحفظ');
            } else {
                setSuccess('تم حفظ السؤال بنجاح');
                setShowForm(false);
                loadData();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch {
            setError('خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من أرشفة/حذف هذا السؤال؟ لن يظهر مجددًا.')) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/questions/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setSuccess('تم حذف السؤال');
                loadData();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message);
            }
        } catch {
            setError('خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === questions.length - 1) return;

        const newQuestions = [...questions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[swapIndex];
        newQuestions[swapIndex] = temp;

        setQuestions(newQuestions);

        try {
            await fetch(`/api/admin/exams/${examId}/questions/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds: newQuestions.map((q) => q._id) })
            });
        } catch (e) {
            // failed silently or revert
        }
    };

    if (loading) return <div className="animate-pulse text-center py-20 text-gray-400">جاري التحميل...</div>;
    if (!exam) return <div className="text-center py-20 text-red-500 font-bold">الامتحان غير موجود.</div>;

    const typeLabels: any = { quiz: 'كويز حصة', weekly: 'أسبوعي', monthly: 'شهري' };

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/admin/exams" className="text-forest hover:underline text-sm font-bold">↩ العودة للامتحانات</Link>
                        <span className="text-gray-300">|</span>
                        <span className="bg-tawfeek-primary/10 text-tawfeek-primary px-2 py-0.5 rounded text-xs font-bold">{typeLabels[exam.type] || exam.type}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                        <span>📝 {questions.filter(q => q.isActive !== false).length} سؤال</span>
                        <span>⭐ درجته: {exam.totalPoints} نقطة</span>
                        <span>⏱ {exam.duration} دقيقة</span>
                        <span>{exam.isPublished ? '🟢 منشور' : '⚫ مسودة'}</span>
                    </div>
                </div>
                <div>
                    <button onClick={openFormForAdd} className="btn-primary" disabled={showForm}>
                        + إضافة سؤال
                    </button>
                </div>
            </div>

            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm font-bold">{success}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">{error}</div>}

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-forest/30">
                    <h2 className="font-bold text-gray-900 text-lg mb-6">{form._id ? 'تعديل السؤال' : 'إنشاء سؤال جديد'}</h2>
                    <form onSubmit={handleSave} className="space-y-5">

                        <div>
                            <label className="input-label">نوع السؤال <span className="text-red-500">*</span></label>
                            <select className="input-field max-w-xs" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="mcq">اختيار من متعدد</option>
                                <option value="true_false">صح أو خطأ</option>
                            </select>
                        </div>

                        <div>
                            <label className="input-label">نص السؤال <span className="text-red-500">*</span></label>
                            <textarea
                                rows={3}
                                required
                                className="input-field resize-y"
                                placeholder="اكتب نص السؤال هنا..."
                                value={form.text}
                                onChange={(e) => setForm({ ...form, text: e.target.value })}>
                            </textarea>
                        </div>

                        {/* Image URL Optional */}
                        <div>
                            <label className="input-label">صورة السؤال <span className="text-gray-400 font-normal">(اختياري)</span></label>
                            <input
                                type="url"
                                className="input-field"
                                placeholder="https://example.com/image.jpg"
                                value={form.image}
                                onChange={(e) => setForm({ ...form, image: e.target.value })}
                            />
                        </div>

                        {/* Answers section */}
                        {form.type === 'mcq' && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                <label className="input-label mb-3">الاختيارات <span className="text-red-500">*</span> <span className="text-xs text-gray-400 font-normal">(يجب تحديد الإجابة الصحيحة واختيارين على الأقل)</span></label>
                                <div className="space-y-3">
                                    {form.choices.map((choice: any, index: number) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="correctChoice"
                                                className="w-5 h-5 text-forest"
                                                required={index === 0 && !form.choices.some((c: any) => c.isCorrect)}
                                                checked={choice.isCorrect}
                                                onChange={() => handleCorrectChoice(index)}
                                            />
                                            <input
                                                type="text"
                                                className={`input-field bg-white ${choice.isCorrect ? 'border-forest/50 bg-forest/5' : ''}`}
                                                placeholder={`الاختيار ${index + 1} ${index < 2 ? ' (مطلوب)' : '(اختياري)'}`}
                                                required={index < 2}
                                                value={choice.text}
                                                onChange={(e) => handleChoiceChange(index, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {form.type === 'true_false' && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                <label className="input-label mb-3">الإجابة الصحيحة <span className="text-red-500">*</span></label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200">
                                        <input
                                            type="radio"
                                            name="correctAnswer"
                                            value="true"
                                            required
                                            checked={form.correctAnswer === 'true'}
                                            onChange={() => setForm({ ...form, correctAnswer: 'true' })}
                                            className="w-4 h-4 text-forest"
                                        /> صح
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200">
                                        <input
                                            type="radio"
                                            name="correctAnswer"
                                            value="false"
                                            required
                                            checked={form.correctAnswer === 'false'}
                                            onChange={() => setForm({ ...form, correctAnswer: 'false' })}
                                            className="w-4 h-4 text-forest"
                                        /> خطأ
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">درجة السؤال <span className="text-red-500">*</span></label>
                                <input type="number" min={1} required className="input-field max-w-xs" value={form.points} onChange={(e) => setForm({ ...form, points: +e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">شرح الإجابة <span className="text-gray-400 font-normal">(اختياري) يظهر للطالب بعد التصحيح</span></label>
                            <textarea
                                rows={2}
                                className="input-field resize-y"
                                placeholder="اكتب الشرح هنا..."
                                value={form.explanation}
                                onChange={(e) => setForm({ ...form, explanation: e.target.value })}>
                            </textarea>
                        </div>

                        <div className="flex gap-3 pt-3 border-t border-gray-100">
                            <button type="submit" disabled={saving} className="btn-primary w-40">{saving ? 'جاري الحفظ...' : 'حفظ السؤال'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary w-32">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
                {questions.filter(q => q.isActive !== false).length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <div className="text-5xl border-gray-50">📑</div>
                        <p className="text-gray-500 mt-3 font-medium">لا توجد أسئلة لهذا الامتحان حتى الآن.</p>
                        <button onClick={openFormForAdd} className="btn-primary mt-4">
                            + إضافة أول سؤال
                        </button>
                    </div>
                ) : (
                    questions.filter(q => q.isActive !== false).map((q, index) => (
                        <div key={q._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group">
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold">سؤال #{index + 1}</span>
                                        <span className="text-tawfeek-primary font-bold text-sm">{q.points} درجة</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">{q.text}</h3>
                                    {q.image && (
                                        <img src={q.image} alt="Question ref" className="mt-3 rounded-xl max-h-40 border border-gray-200" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30">▲</button>
                                    <button onClick={() => handleMove(index, 'down')} disabled={index === questions.filter(x => x.isActive !== false).length - 1} className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30">▼</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 bg-gray-50 p-4 rounded-xl">
                                {q.choices?.map((c: any, i: number) => (
                                    <div key={i} className={`p-2 rounded-lg text-sm border flex items-center gap-2 ${c.isCorrect ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 'bg-white border-gray-200 text-gray-600'}`}>
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${c.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                                            {c.isCorrect && '✓'}
                                        </span>
                                        {c.text}
                                    </div>
                                ))}
                            </div>

                            {q.explanation && (
                                <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm p-3 rounded-lg mb-4">
                                    <span className="font-bold block mb-1">شرح الإجابة:</span>
                                    {q.explanation}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => openFormForEdit(q)} className="text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-1.5 rounded-lg font-bold">تعديل</button>
                                <button onClick={() => handleDelete(q._id)} className="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 rounded-lg font-bold">حذف</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}
