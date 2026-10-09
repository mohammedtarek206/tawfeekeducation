'use client';

import { useState } from 'react';
import { ACTIVE_GRADES } from '@/lib/constants/grades';
import { SUBJECTS } from '@/lib/constants/subjects';

interface ParsedQuestion {
    index: number;
    text: string;
    answer?: string;
    options?: string[];
    correctAnswer?: string;
    type?: string;
    valid: boolean;
    isDuplicate: boolean;
    error?: string;
}

interface ParseStats {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
}

const DIFFICULTY_OPTS = [
    { value: 'easy', label: 'سهل' },
    { value: 'medium', label: 'متوسط' },
    { value: 'hard', label: 'صعب' },
];

export default function QuestionImportPage() {
    const [importMethod, setImportMethod] = useState<'manual' | 'drive'>('manual');
    const [driveUrl, setDriveUrl] = useState('');
    const [rawText, setRawText] = useState('');
    const [grade, setGrade] = useState('');
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<ParsedQuestion[]>([]);
    const [stats, setStats] = useState<ParseStats | null>(null);
    const [skipped, setSkipped] = useState<Set<number>>(new Set());
    const [importResult, setImportResult] = useState<{ count: number } | null>(null);

    const handleParse = async () => {
        if (importMethod === 'manual' && !rawText.trim()) { setError('يرجى إدخال النص أولاً'); return; }
        if (importMethod === 'drive' && !driveUrl.trim()) { setError('يرجى إدخال رابط Google Drive'); return; }
        setLoading(true);
        setError('');
        try {
            const apiPath = importMethod === 'drive' ? '/api/admin/questions/parse-drive' : '/api/admin/questions/parse';
            const bodyPayload = importMethod === 'drive' ? { url: driveUrl } : { text: rawText };

            const res = await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) { setError(json.message); return; }
            setPreview(json.data.preview);
            setStats(json.data.stats);
            setSkipped(
                new Set(
                    json.data.preview
                        .filter((q: ParsedQuestion) => !q.valid || q.isDuplicate)
                        .map((q: ParsedQuestion) => q.index)
                )
            );
            setStep('preview');
        } catch { setError('حدث خطأ أثناء التحليل'); }
        finally { setLoading(false); }
    };

    const toggleSkip = (idx: number) => {
        setSkipped((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const updateQuestion = (idx: number, fields: Partial<ParsedQuestion>) => {
        setPreview((prev) =>
            prev.map((q) => {
                if (q.index !== idx) return q;
                const updated = { ...q, ...fields };
                // re-evaluate validity
                const hasText = Boolean(updated.text && updated.text.trim());
                const hasAnswer = Boolean((updated.correctAnswer || updated.answer || '').trim());
                updated.valid = hasText && (hasAnswer || updated.type === 'essay');
                if (!hasText) updated.error = 'النص فارغ';
                else if (!hasAnswer && updated.type !== 'essay') updated.error = 'الإجابة مفقودة';
                else updated.error = undefined;
                return updated;
            })
        );
    };

    const deleteQuestion = (idx: number) => {
        setPreview((prev) => prev.filter((q) => q.index !== idx));
        setStats((prev) => prev ? { ...prev, total: prev.total - 1 } : null);
    };

    const handleImport = async () => {
        if (!grade) { setError('يرجى اختيار الصف'); return; }
        if (!subject) { setError('يرجى اختيار المادة'); return; }
        setLoading(true);
        setError('');
        try {
            const toImport = preview.map((q) => ({ ...q, skip: skipped.has(q.index) }));
            const res = await fetch('/api/admin/questions/parse?action=import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: toImport, grade, subject, difficulty }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) { setError(json.message); return; }
            setImportResult(json.data);
            setStep('done');
        } catch { setError('حدث خطأ أثناء الاستيراد'); }
        finally { setLoading(false); }
    };

    const reset = () => {
        setRawText(''); setDriveUrl(''); setGrade(''); setSubject(''); setDifficulty('medium');
        setStep('input'); setError(''); setPreview([]); setStats(null);
        setSkipped(new Set()); setImportResult(null);
    };

    const validToImport = preview.filter((q) => !skipped.has(q.index)).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">استيراد أسئلة ذكي 🧠</h1>
                    <p className="text-gray-500 text-sm mt-1">الصق نصاً وسيتم تحليله تلقائياً وإضافته لبنك الأسئلة</p>
                </div>
                {step !== 'input' && (
                    <button onClick={reset} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        ← استيراد جديد
                    </button>
                )}
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-3">
                {(['input', 'preview', 'done'] as const).map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? 'bg-forest text-white' :
                            (step === 'preview' && i === 0) || step === 'done' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {(step === 'preview' && i === 0) || (step === 'done' && i < 2) ? '✓' : i + 1}
                        </div>
                        <span className={`text-sm font-medium ${step === s ? 'text-forest' : 'text-gray-400'}`}>
                            {s === 'input' ? 'الإدخال' : s === 'preview' ? 'المعاينة' : 'تم'}
                        </span>
                        {i < 2 && <div className={`w-8 h-px ${i < (['input', 'preview', 'done'].indexOf(step)) ? 'bg-green-400' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            {/* ── STEP 1: INPUT ── */}
            {step === 'input' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

                    {/* Method Selector Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                        <button
                            type="button"
                            onClick={() => { setImportMethod('manual'); setError(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === 'manual' ? "bg-white text-forest shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            إدخال يدوي
                        </button>
                        <button
                            type="button"
                            onClick={() => { setImportMethod('drive'); setError(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === 'drive' ? "bg-white text-forest shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            استيراد من Google Drive
                        </button>
                    </div>

                    {importMethod === 'manual' ? (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                                <div className="font-bold mb-2">📋 الصيغ المدعومة:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                                    <div className="bg-white rounded-lg p-2 border border-blue-100">
                                        <div className="font-bold text-blue-700 mb-1">الصيغة العربية:</div>
                                        <div>س: ما عاصمة مصر؟</div>
                                        <div>ج: القاهرة</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-2 border border-blue-100">
                                        <div className="font-bold text-blue-700 mb-1">الصيغة الإنجليزية:</div>
                                        <div>Q: What is the capital?</div>
                                        <div>A: Cairo</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">النص (الأسئلة والإجابات) *</label>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    placeholder={`س: ما عاصمة مصر؟\nج: القاهرة\n\nس: ما أطول نهر في العالم؟\nج: نهر النيل`}
                                    rows={12}
                                    className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono leading-relaxed focus:outline-none focus:border-forest resize-y"
                                    dir="auto"
                                />
                                <div className="text-xs text-gray-400 mt-1 text-left">{rawText.length} حرف</div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
                                <div className="font-bold mb-1">⚠️ تنبيه بشأن صلاحيات الملف:</div>
                                <div>تأكد أن الملف متاح الوصول (Anyone with the link) حتى يتمكن النظام من قراءته.</div>
                                <div className="mt-1">الملفات المدعومة: Google Docs, Google Sheets, PDF (أقل من 3 ميجا).</div>
                            </div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رابط ملف Google Drive *</label>
                            <input
                                type="url"
                                value={driveUrl}
                                onChange={(e) => setDriveUrl(e.target.value)}
                                placeholder="https://drive.google.com/file/d/FILE_ID/view"
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-forest text-left"
                                dir="ltr"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">الصف الدراسي *</label>
                            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-forest">
                                <option value="">اختر الصف</option>
                                {ACTIVE_GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">المادة *</label>
                            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-forest">
                                <option value="">اختر المادة</option>
                                {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">مستوى الصعوبة</label>
                            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-forest">
                                {DIFFICULTY_OPTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

                    <button
                        onClick={handleParse}
                        disabled={loading || (importMethod === 'manual' ? !rawText.trim() : !driveUrl.trim())}
                        className="w-full py-3 bg-forest text-white rounded-xl font-bold text-sm hover:bg-forest/90 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '⏳ جاري التحليل...' : (importMethod === 'manual' ? '🔍 تحليل النص' : '🔍 تحليل الملف من Drive')}
                    </button>
                </div>
            )}

            {/* ── STEP 2: PREVIEW ── */}
            {step === 'preview' && stats && (
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'إجمالي', value: stats.total, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                            { label: 'صالح', value: stats.valid, color: 'bg-green-50 text-green-700 border-green-200' },
                            { label: 'غير صالح', value: stats.invalid, color: 'bg-red-50 text-red-700 border-red-200' },
                            { label: 'مكرر', value: stats.duplicates, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        ].map((s) => (
                            <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
                                <div className="text-2xl font-black">{s.value}</div>
                                <div className="text-xs font-semibold mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="font-bold text-gray-700">معاينة الأسئلة</span>
                            <span className="text-sm text-gray-500">سيتم استيراد <strong className="text-forest">{validToImport}</strong> سؤال</span>
                        </div>

                        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                            {preview.map((q) => {
                                const isSkipped = skipped.has(q.index);
                                return (
                                    <div key={q.index} className={`px-5 py-4 flex gap-3 transition-colors ${isSkipped ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
                                        <button
                                            onClick={() => toggleSkip(q.index)}
                                            className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isSkipped ? 'border-gray-300 bg-gray-100' : 'border-forest bg-forest text-white'
                                                }`}
                                        >
                                            {!isSkipped && <span className="text-xs">✓</span>}
                                        </button>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-gray-400">#{q.index + 1}</span>
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold uppercase">{q.type || 'short_answer'}</span>
                                                    {q.isDuplicate && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">مكرر</span>}
                                                    {!q.valid && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{q.error || 'غير صالح'}</span>}
                                                </div>
                                                <button
                                                    onClick={() => deleteQuestion(q.index)}
                                                    className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                                                >
                                                    🗑 حذف
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                value={q.text}
                                                onChange={(e) => updateQuestion(q.index, { text: e.target.value })}
                                                className="w-full text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 focus:border-forest outline-none"
                                                dir="rtl"
                                            />

                                            {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                                <div className="flex flex-col gap-1 pr-2 border-r-2 border-gray-100">
                                                    {q.options.map((opt, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newOpts = [...(q.options || [])];
                                                                    newOpts[i] = e.target.value;
                                                                    updateQuestion(q.index, { options: newOpts });
                                                                }}
                                                                className="flex-1 text-xs text-gray-700 border border-gray-100 rounded px-2 py-1 focus:border-forest outline-none"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-green-700">الإجابة:</span>
                                                <input
                                                    type="text"
                                                    value={q.correctAnswer || q.answer || ''}
                                                    onChange={(e) => updateQuestion(q.index, { correctAnswer: e.target.value, answer: e.target.value })}
                                                    className="flex-1 text-xs text-green-800 font-bold bg-green-50/70 border border-green-200 rounded-lg px-3 py-1 focus:border-forest outline-none"
                                                    placeholder="اكتب الإجابة النموذجية..."
                                                    dir="rtl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
                        <div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">الصف:</span>
                                    <strong className="mr-1">{ACTIVE_GRADES.find((g) => g.value === grade)?.label || grade}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">المادة:</span>
                                    <strong className="mr-1">{SUBJECTS.find((s) => s.value === subject)?.label || subject}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">الصعوبة:</span>
                                    <strong className="mr-1">{DIFFICULTY_OPTS.find((d) => d.value === difficulty)?.label}</strong>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                            <button onClick={() => setStep('input')} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">
                                تعديل
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={loading || validToImport === 0}
                                className="px-6 py-2 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest/90 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '⏳ جاري الاستيراد...' : `📥 استيراد ${validToImport} سؤال`}
                            </button>
                        </div>
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
                </div>
            )}

            {/* ── STEP 3: DONE ── */}
            {step === 'done' && importResult && (
                <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-12 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">تم الاستيراد بنجاح!</h2>
                    <p className="text-gray-500 text-lg mb-6">
                        تم إضافة <strong className="text-forest text-2xl">{importResult.count}</strong> سؤال لبنك الأسئلة
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={reset} className="px-6 py-3 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-colors">
                            📝 استيراد المزيد
                        </button>
                        <a href="/admin/questions" className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                            🔍 عرض بنك الأسئلة
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
