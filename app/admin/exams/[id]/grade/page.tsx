'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminEssayGradingPage() {
    const { id: examId } = useParams();

    const [exam, setExam] = useState<any>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Grading form state: { [answerId]: { points, notes } }
    const [gradingState, setGradingState] = useState<Record<string, { points: string; notes: string }>>({});
    const [grading, setGrading] = useState<Record<string, boolean>>({});

    const loadData = useCallback(() => {
        if (!examId) return;
        setLoading(true);
        Promise.all([
            fetch(`/api/admin/exams/grade-essay?examId=${examId}`).then(r => r.json()),
            fetch(`/api/admin/exams/${examId}/questions`).then(r => r.json()),
        ])
            .then(([attemptsRes, questionsRes]) => {
                if (attemptsRes.success) setAttempts(attemptsRes.data.attempts);
                if (questionsRes.success) {
                    setExam(questionsRes.data.exam);
                    setQuestions(questionsRes.data.questions.filter((q: any) => q.type === 'essay'));
                }
            })
            .catch(() => setError('فشل في تحميل البيانات'))
            .finally(() => setLoading(false));
    }, [examId]);

    useEffect(() => { loadData(); }, [loadData]);

    const getGradingKey = (attemptId: string, questionId: string) => `${attemptId}-${questionId}`;

    const setGradeField = (attemptId: string, questionId: string, field: 'points' | 'notes', value: string) => {
        const key = getGradingKey(attemptId, questionId);
        setGradingState(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    const handleGrade = async (attempt: any, essayAnswer: any, question: any) => {
        const key = getGradingKey(attempt._id, essayAnswer.questionId);
        const state = gradingState[key] || {};
        const pts = parseFloat(state.points ?? '0');

        if (isNaN(pts) || pts < 0) {
            setError('أدخل درجة صحيحة (صفر أو أكثر)');
            return;
        }
        if (pts > question.points) {
            setError(`الدرجة (${pts}) تتجاوز الحد الأقصى (${question.points})`);
            return;
        }

        setGrading(prev => ({ ...prev, [key]: true }));
        setError('');

        try {
            const res = await fetch('/api/admin/exams/grade-essay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId: attempt._id,
                    questionId: essayAnswer.questionId,
                    pointsEarned: pts,
                    gradingNotes: state.notes || '',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`تم تصحيح إجابة ${attempt.student?.name || 'الطالب'} بنجاح ✅`);
                setTimeout(() => setSuccess(''), 4000);
                loadData(); // refresh
            } else {
                setError(data.message || 'حدث خطأ أثناء التصحيح');
            }
        } catch {
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setGrading(prev => ({ ...prev, [key]: false }));
        }
    };

    if (loading) return <div className="animate-pulse text-center py-20 text-gray-400">جاري التحميل...</div>;

    const typeLabels: any = { quiz: 'كويز حصة', weekly: 'أسبوعي', monthly: 'شهري' };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                    <Link href={`/admin/exams/${examId}/questions`} className="text-forest hover:underline text-sm font-bold">↩ إدارة الأسئلة</Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/admin/exams" className="text-gray-500 hover:underline text-sm">الامتحانات</Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                    تصحيح الأسئلة المقالية
                    {exam && <span className="text-lg text-gray-500 font-normal mr-2">— {exam.title}</span>}
                </h1>
                {exam && (
                    <div className="flex gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        <span>📊 {typeLabels[exam.type] || exam.type}</span>
                        <span>✍️ {questions.length} سؤال مقالي</span>
                        <span>👤 {attempts.length} محاولة</span>
                        <span>⏳ {attempts.filter(a => a.hasUngradedEssays).length} بانتظار التصحيح</span>
                    </div>
                )}
            </div>

            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm font-bold">{success}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">{error}</div>}

            {attempts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-gray-500 font-medium">لا توجد محاولات مسلّمة لهذا الامتحان حتى الآن.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {attempts.map((attempt) => {
                        const essayAnswers = attempt.answers?.filter((a: any) => a.essayAnswer !== undefined) || [];
                        if (essayAnswers.length === 0) return null;

                        const isPending = attempt.hasUngradedEssays;

                        return (
                            <div key={attempt._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isPending ? 'border-orange-200' : 'border-green-200'}`}>
                                {/* Student header */}
                                <div className={`px-6 py-4 flex items-center justify-between gap-4 ${isPending ? 'bg-orange-50' : 'bg-green-50'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                {isPending ? '⏳ بانتظار التصحيح' : '✅ تم التصحيح'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900">{attempt.student?.name || 'طالب'}</h3>
                                        <p className="text-xs text-gray-500">{attempt.student?.phone} · الصف: {attempt.student?.grade}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-gray-900">{attempt.score}/{attempt.totalPoints}</div>
                                        <div className="text-xs text-gray-500">النتيجة الحالية</div>
                                        {!isPending && (
                                            <div className={`text-xs font-bold mt-1 ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                                                {attempt.percentage}% · {attempt.passed ? 'ناجح' : 'راسب'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Essay answers */}
                                <div className="divide-y divide-gray-50">
                                    {essayAnswers.map((answer: any) => {
                                        const question = questions.find(q => q._id === answer.questionId || q._id?.toString() === answer.questionId?.toString());
                                        const key = getGradingKey(attempt._id, answer.questionId);
                                        const state = gradingState[key] ?? {
                                            points: answer.pointsEarned?.toString() || '0',
                                            notes: answer.gradingNotes || ''
                                        };
                                        const isGraded = answer.gradingStatus === 'graded';

                                        return (
                                            <div key={answer.questionId} className="p-6 space-y-4">
                                                {/* Question text */}
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-gray-500">السؤال المقالي</span>
                                                        <span className="text-xs font-bold text-tawfeek-primary">{question?.points || '?'} درجة كاملة</span>
                                                    </div>
                                                    <p className="font-bold text-gray-900 leading-relaxed">{question?.text || 'السؤال غير موجود'}</p>
                                                    {question?.modelAnswer && (
                                                        <details className="mt-3">
                                                            <summary className="text-xs text-purple-600 font-bold cursor-pointer hover:text-purple-700">
                                                                عرض الإجابة النموذجية
                                                            </summary>
                                                            <div className="mt-2 bg-purple-50 rounded-lg p-3 text-sm text-purple-900">
                                                                {question.modelAnswer}
                                                            </div>
                                                        </details>
                                                    )}
                                                    {question?.gradingCriteria && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-indigo-600 font-bold cursor-pointer">
                                                                معايير التصحيح
                                                            </summary>
                                                            <div className="mt-2 bg-indigo-50 rounded-lg p-3 text-sm text-indigo-900">
                                                                {question.gradingCriteria}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>

                                                {/* Student answer */}
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 mb-1">إجابة الطالب:</p>
                                                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-800 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap" dir="rtl">
                                                        {answer.essayAnswer || <span className="text-gray-400 italic">لم يكتب الطالب إجابة</span>}
                                                    </div>
                                                </div>

                                                {/* Grading section */}
                                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-bold text-gray-700">تصحيح الإجابة</span>
                                                        {isGraded && (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">
                                                                ✓ تم التصحيح — {answer.pointsEarned}/{question?.points}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-sm text-gray-600 font-bold whitespace-nowrap">
                                                            الدرجة (من {question?.points || '?'}):
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={question?.points || 100}
                                                            step={0.5}
                                                            className="input-field max-w-[100px] text-center"
                                                            value={state.points}
                                                            onChange={(e) => setGradeField(attempt._id, answer.questionId, 'points', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm text-gray-600 font-bold block mb-1">
                                                            ملاحظات المصحح <span className="font-normal text-gray-400">(اختياري، ستظهر للطالب)</span>
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            className="input-field resize-y text-sm"
                                                            placeholder="أضف ملاحظاتك على الإجابة..."
                                                            value={state.notes}
                                                            onChange={(e) => setGradeField(attempt._id, answer.questionId, 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleGrade(attempt, answer, question)}
                                                        disabled={grading[key]}
                                                        className={`btn-primary text-sm px-6 disabled:opacity-60 ${isGraded ? 'btn-secondary' : ''}`}
                                                    >
                                                        {grading[key] ? 'جاري التصحيح...' : isGraded ? '🔄 تعديل الدرجة' : '✓ حفظ التصحيح'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
