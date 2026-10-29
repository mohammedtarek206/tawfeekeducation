'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ACTIVE_GRADES } from '@/lib/constants/grades';
import { SUBJECTS } from '@/lib/constants/subjects';

interface ParsedQuestion {
    index: number;
    text: string;
    answer?: string;
    options?: string[];
    correctAnswer?: string;
    correctIndex?: number;
    type?: 'mcq' | 'true_false' | 'essay';
    points?: number;
    explanation?: string;
    modelAnswer?: string;
    gradingCriteria?: string;
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

function QuestionImportContent() {
    const searchParams = useSearchParams();
    const queryExamId = searchParams.get('examId') || '';

    // Target Selection: Bank vs Specific Exam
    const [targetType, setTargetType] = useState<'bank' | 'exam'>(queryExamId ? 'exam' : 'bank');
    const [selectedExamId, setSelectedExamId] = useState(queryExamId);
    const [availableExams, setAvailableExams] = useState<any[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);

    // Import Method
    const [importMethod, setImportMethod] = useState<'text' | 'file' | 'drive'>('text');
    const [rawText, setRawText] = useState('');
    const [driveUrl, setDriveUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Attributes
    const [grade, setGrade] = useState('');
    const [subject, setSubject] = useState('');
    const [difficulty, setDifficulty] = useState('medium');

    // Flow State
    const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<ParsedQuestion[]>([]);
    const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all');
    const [stats, setStats] = useState<ParseStats | null>(null);
    const [skipped, setSkipped] = useState<Set<number>>(new Set());
    const [importResult, setImportResult] = useState<{ count: number; examId?: string; examTitle?: string } | null>(null);

    // Load available exams for target selection
    useEffect(() => {
        setLoadingExams(true);
        fetch('/api/admin/exams')
            .then((r) => r.json())
            .then((res) => {
                if (res.success && Array.isArray(res.data?.exams)) {
                    setAvailableExams(res.data.exams);
                    if (queryExamId) {
                        const matched = res.data.exams.find((e: any) => e._id === queryExamId);
                        if (matched) {
                            setSelectedExamId(matched._id);
                            setTargetType('exam');
                            if (matched.grade) setGrade(matched.grade);
                            if (matched.subject) setSubject(matched.subject);
                        }
                    }
                }
            })
            .catch(() => {})
            .finally(() => setLoadingExams(false));
    }, [queryExamId]);

    // When an exam is selected, prefill grade and subject
    const handleExamChange = (examId: string) => {
        setSelectedExamId(examId);
        const ex = availableExams.find((e) => e._id === examId);
        if (ex) {
            if (ex.grade) setGrade(ex.grade);
            if (ex.subject) setSubject(ex.subject);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            const name = f.name.toLowerCase();
            if (!name.endsWith('.txt') && !name.endsWith('.docx') && !name.endsWith('.pdf')) {
                setError('نوع الملف غير مدعوم. يرجى اختيار ملف TXT أو DOCX أو PDF.');
                setSelectedFile(null);
                return;
            }
            if (f.size > 10 * 1024 * 1024) {
                setError('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(f);
            setError('');
        }
    };

    // Parsing Handler
    const handleParse = async () => {
        setError('');
        if (targetType === 'exam' && !selectedExamId) {
            setError('يرجى اختيار الامتحان المراد إضافة الأسئلة إليه');
            return;
        }

        if (importMethod === 'text' && !rawText.trim()) {
            setError('يرجى كتابة أو لصق نص الأسئلة أولاً');
            return;
        }
        if (importMethod === 'file' && !selectedFile) {
            setError('يرجى اختيار ملف TXT أو DOCX أو PDF');
            return;
        }
        if (importMethod === 'drive' && !driveUrl.trim()) {
            setError('يرجى إدخال رابط ملف Google Drive');
            return;
        }

        setLoading(true);
        try {
            let res: Response;
            if (importMethod === 'file' && selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                res = await fetch('/api/admin/questions/parse', {
                    method: 'POST',
                    body: formData,
                });
            } else if (importMethod === 'drive') {
                res = await fetch('/api/admin/questions/parse-drive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: driveUrl }),
                });
            } else {
                res = await fetch('/api/admin/questions/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: rawText }),
                });
            }

            let json: any = null;
            try {
                json = await res.json();
            } catch {
                throw new Error(`استجابة غير صالحة من الخادم (رمز الحالة: ${res.status} ${res.statusText})`);
            }

            if (!res.ok || !json?.success) {
                setError(json?.message || `فشل في تحليل الأسئلة (رمز: ${res.status})`);
                return;
            }

            const parsedList: ParsedQuestion[] = json?.data?.preview || [];
            if (!Array.isArray(parsedList) || parsedList.length === 0) {
                setError('لم يتم العثور على أي أسئلة صالحة في النص المدخل');
                return;
            }

            setPreview(parsedList);
            setStats(json.data.stats || {
                total: parsedList.length,
                valid: parsedList.filter((q) => q.valid).length,
                invalid: parsedList.filter((q) => !q.valid).length,
                duplicates: parsedList.filter((q) => q.isDuplicate).length,
            });

            // Automatically skip invalid or duplicate items initially
            setSkipped(
                new Set(
                    parsedList
                        .filter((q) => !q.valid || q.isDuplicate)
                        .map((q) => q.index)
                )
            );
            setStep('preview');
        } catch (err: any) {
            console.error('Question parse client error:', err);
            setError(err?.message || 'حدث خطأ في الاتصال بالخادم أثناء تحليل الأسئلة');
        } finally {
            setLoading(false);
        }
    };

    const toggleSkip = (idx: number) => {
        setSkipped((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    // Update single question in preview
    const updateQuestion = (idx: number, fields: Partial<ParsedQuestion>) => {
        setPreview((prev) =>
            prev.map((q) => {
                if (q.index !== idx) return q;
                const updated = { ...q, ...fields };

                // Re-evaluate validity
                const hasText = Boolean(updated.text && updated.text.trim().length >= 3);
                let isValid = hasText;
                let errMsg: string | undefined = undefined;

                if (!hasText) {
                    isValid = false;
                    errMsg = 'نص السؤال قصير جداً أو مفقود';
                } else if (updated.type === 'essay') {
                    const ans = (updated.modelAnswer || updated.correctAnswer || updated.answer || '').trim();
                    isValid = Boolean(ans);
                    if (!isValid) errMsg = 'السؤال غير مكتمل (يرجى كتابة الإجابة النموذجية)';
                } else if (updated.type === 'true_false') {
                    const ans = (updated.correctAnswer || '').trim();
                    isValid = ans === 'صح' || ans === 'خطأ';
                    if (!isValid) errMsg = 'حدد الإجابة الصحيحة (صح أو خطأ)';
                } else {
                    // mcq
                    const opts = updated.options || [];
                    if (opts.length < 2) {
                        isValid = false;
                        errMsg = 'يجب توفر خيارين على الأقل';
                    } else if (!updated.correctAnswer) {
                        isValid = false;
                        errMsg = 'لم يتم تحديد الإجابة الصحيحة';
                    }
                }

                updated.valid = isValid;
                updated.error = errMsg;
                return updated;
            })
        );
    };

    const deleteQuestion = (idx: number) => {
        setPreview((prev) => prev.filter((q) => q.index !== idx));
        setStats((prev) => (prev ? { ...prev, total: prev.total - 1 } : null));
    };

    const addChoice = (qIndex: number) => {
        const q = preview.find((item) => item.index === qIndex);
        if (!q) return;
        const currentOpts = q.options || [];
        updateQuestion(qIndex, { options: [...currentOpts, `خيار جديد ${currentOpts.length + 1}`] });
    };

    const removeChoice = (qIndex: number, choiceIndex: number) => {
        const q = preview.find((item) => item.index === qIndex);
        if (!q) return;
        const currentOpts = [...(q.options || [])];
        const removed = currentOpts.splice(choiceIndex, 1)[0];
        let newCorrect = q.correctAnswer;
        if (newCorrect === removed) {
            newCorrect = currentOpts[0] || '';
        }
        updateQuestion(qIndex, { options: currentOpts, correctAnswer: newCorrect });
    };

    // Import Execution
    const handleImport = async () => {
        if (loading) return;
        setError('');
        if (targetType === 'bank') {
            if (!grade) { setError('يرجى اختيار الصف الدراسي للأسئلة'); return; }
            if (!subject) { setError('يرجى اختيار المادة الدراسية للأسئلة'); return; }
        } else {
            if (!selectedExamId) { setError('يرجى اختيار الامتحان المستهدف'); return; }
        }

        const toImport = preview.filter((q) => !skipped.has(q.index));
        if (toImport.length === 0) {
            setError('لم يتم تحديد أي أسئلة صالحة للاستيراد');
            return;
        }

        const invalidSelected = toImport.filter((q) => !q.valid);
        if (invalidSelected.length > 0) {
            setError(`يوجد ${invalidSelected.length} سؤال غير مكتمل أو غير صالح محدد للاستيراد. يرجى تصحيحه أو إلغاء تحديده أولاً.`);
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                questions: toImport,
                grade,
                subject,
                difficulty,
                examId: targetType === 'exam' ? selectedExamId : undefined,
            };

            const res = await fetch('/api/admin/questions/parse?action=import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            let json: any = null;
            try {
                json = await res.json();
            } catch {
                throw new Error(`استجابة غير صالحة من الخادم أثناء الحفظ (رمز: ${res.status})`);
            }
            if (!res.ok || !json?.success) {
                setError(json?.message || 'حدث خطأ أثناء استيراد الأسئلة');
                return;
            }

            setImportResult(json.data);
            setStep('done');
        } catch (err: any) {
            console.error('Question import client error:', err);
            setError(err?.message || 'حدث خطأ في الاتصال بالخادم أثناء حفظ الأسئلة');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setRawText('');
        setDriveUrl('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!queryExamId) {
            setGrade('');
            setSubject('');
            setSelectedExamId('');
            setTargetType('bank');
        }
        setDifficulty('medium');
        setStep('input');
        setError('');
        setPreview([]);
        setStats(null);
        setSkipped(new Set());
        setImportResult(null);
    };

    const validToImportCount = preview.filter((q) => !skipped.has(q.index)).length;

    const filteredPreview = preview.filter((q) => {
        if (previewFilter === 'valid') return q.valid && !q.isDuplicate;
        if (previewFilter === 'invalid') return !q.valid;
        if (previewFilter === 'duplicates') return q.isDuplicate;
        return true;
    });

    const activeExam = availableExams.find((e) => e._id === selectedExamId);

    return (
        <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/admin/questions" className="text-xs text-forest font-bold hover:underline">
                            ↩ بنك الأسئلة
                        </Link>
                        {queryExamId && (
                            <>
                                <span className="text-gray-300">|</span>
                                <Link href={`/admin/exams/${queryExamId}/questions`} className="text-xs text-forest font-bold hover:underline">
                                    ↩ أسئلة الامتحان
                                </Link>
                            </>
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">استيراد الأسئلة الذكي 📥</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        استيراد أسئلة متعددة بسهولة من نصوص، ملفات TXT / Word / PDF أو روابط Google Drive.
                    </p>
                </div>
                {step !== 'input' && (
                    <button
                        onClick={reset}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        ← استيراد جديد
                    </button>
                )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                {[
                    { key: 'input', label: '1. المصدر والبيانات' },
                    { key: 'preview', label: '2. معاينة وتعديل' },
                    { key: 'done', label: '3. اكتمال الاستيراد' },
                ].map((s, idx) => {
                    const isCurrent = step === s.key;
                    const isDone = (step === 'preview' && idx === 0) || (step === 'done' && idx < 2);
                    return (
                        <div key={s.key} className="flex items-center gap-2 flex-1">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isDone
                                        ? 'bg-green-500 text-white'
                                        : isCurrent
                                        ? 'bg-forest text-white'
                                        : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {isDone ? '✓' : idx + 1}
                            </div>
                            <span className={`text-xs sm:text-sm font-bold ${isCurrent ? 'text-forest' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                            {idx < 2 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />}
                        </div>
                    );
                })}
            </div>

            {/* ── STEP 1: INPUT ── */}
            {step === 'input' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    {/* Destination Selection */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                        <label className="block text-sm font-black text-gray-800">🎯 الوجهة المستهدفة للأسئلة:</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    targetType === 'bank'
                                        ? 'border-forest bg-forest/5 text-forest font-bold'
                                        : 'border-gray-200 bg-white text-gray-600'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="targetType"
                                    checked={targetType === 'bank'}
                                    onChange={() => setTargetType('bank')}
                                    className="accent-forest"
                                />
                                <div>
                                    <div className="text-sm font-bold">بنك الأسئلة العام</div>
                                    <div className="text-xs text-gray-400">إضافة للبنك لاستخدامها لاحقاً وتدريب الطلاب</div>
                                </div>
                            </label>

                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    targetType === 'exam'
                                        ? 'border-forest bg-forest/5 text-forest font-bold'
                                        : 'border-gray-200 bg-white text-gray-600'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="targetType"
                                    checked={targetType === 'exam'}
                                    onChange={() => setTargetType('exam')}
                                    className="accent-forest"
                                />
                                <div>
                                    <div className="text-sm font-bold">ربط مباشر بامتحان معين</div>
                                    <div className="text-xs text-gray-400">تضاف للبنك وتُرْبَط بالامتحان المختار فوراً</div>
                                </div>
                            </label>
                        </div>

                        {targetType === 'exam' && (
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1">اختر الامتحان المستهدف *</label>
                                <select
                                    value={selectedExamId}
                                    onChange={(e) => handleExamChange(e.target.value)}
                                    className="input-field bg-white"
                                >
                                    <option value="">— اختر الامتحان —</option>
                                    {availableExams.map((ex) => (
                                        <option key={ex._id} value={ex._id}>
                                            {ex.title} ({ex.type === 'monthly' ? 'شهري' : ex.type === 'weekly' ? 'أسبوعي' : 'كويز'})
                                        </option>
                                    ))}
                                </select>
                                {activeExam && (
                                    <p className="text-xs text-forest mt-1">
                                        سيتم استيراد الأسئلة لصف <strong>{activeExam.grade}</strong> ومادة <strong>{activeExam.subject}</strong>.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Method Selector Tabs */}
                    <div>
                        <label className="block text-sm font-black text-gray-800 mb-2">📥 طريقة الإدخال:</label>
                        <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => { setImportMethod('text'); setError(''); }}
                                className={`py-2 text-sm font-bold rounded-lg transition-all ${
                                    importMethod === 'text' ? 'bg-white text-forest shadow-sm' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                ✍️ كتابة أو لصق نص
                            </button>
                            <button
                                type="button"
                                onClick={() => { setImportMethod('file'); setError(''); }}
                                className={`py-2 text-sm font-bold rounded-lg transition-all ${
                                    importMethod === 'file' ? 'bg-white text-forest shadow-sm' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                📄 رفع ملف (TXT / Word / PDF)
                            </button>
                            <button
                                type="button"
                                onClick={() => { setImportMethod('drive'); setError(''); }}
                                className={`py-2 text-sm font-bold rounded-lg transition-all ${
                                    importMethod === 'drive' ? 'bg-white text-forest shadow-sm' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                🌐 Google Drive
                            </button>
                        </div>
                    </div>

                    {/* Method 1: Text */}
                    {importMethod === 'text' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-bold text-gray-700">النص المراد تحليله *</label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRawText(`س: ما عاصمة جمهورية مصر العربية؟\nأ) القاهرة\nب) الإسكندرية\nج) أسوان\nد) الأقصر\nالإجابة: أ\nالدرجة: 2\nالشرح: القاهرة هي العاصمة التاريخية والسياسية لمصر.\n\nنوع السؤال: مقالي\nس: اشرح أهم أسباب قيام ثورة 1919.\nالدرجة: 4\nالإجابة النموذجية: نفي سعد زغلول وإعلان الحماية البريطانية.\nمعايير التصحيح: درجة لكل نقطة رئيسية.\n\nس: نهر النيل هو أطول أنهار العالم؟\nالإجابة: صح\nالدرجة: 1`)
                                    }
                                    className="text-xs text-forest font-bold hover:underline"
                                >
                                    📋 إدراج نموذج تجريبي
                                </button>
                            </div>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder={`س: ما عاصمة مصر؟\nأ) القاهرة\nب) الإسكندرية\nج) أسوان\nد) الأقصر\nالإجابة: أ\nالدرجة: 1\nالشرح: القاهرة هي العاصمة.`}
                                rows={10}
                                className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono leading-relaxed focus:outline-none focus:border-forest resize-y"
                                dir="rtl"
                            />
                            <div className="text-xs text-gray-400 text-left">{rawText.length} حرف</div>
                        </div>
                    )}

                    {/* Method 2: File Upload */}
                    {importMethod === 'file' && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-200 hover:border-forest rounded-2xl p-8 text-center transition-colors bg-gray-50/50">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".txt,.docx,.pdf"
                                    className="hidden"
                                />
                                <div className="text-4xl mb-3">📁</div>
                                <h3 className="font-bold text-gray-800 text-base mb-1">
                                    {selectedFile ? selectedFile.name : 'اسحب الملف هنا أو اضغط للاختيار'}
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    الملفات المدعومة: نصوص TXT، ومستندات Word (.docx)، وملفات PDF النصية (بحد أقصى 10 ميجا)
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-secondary px-6 py-2 text-sm"
                                >
                                    {selectedFile ? '🔄 تغيير الملف' : '📂 اختيار ملف من الجهاز'}
                                </button>
                            </div>

                            {selectedFile && (
                                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-xs flex justify-between items-center">
                                    <span>
                                        جاهز للتحليل: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} ك.ب)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="text-red-600 font-bold hover:underline"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Method 3: Google Drive */}
                    {importMethod === 'drive' && (
                        <div className="space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
                                <div className="font-bold">⚠️ تنبيه بشأن صلاحيات ملف Google Drive:</div>
                                <div>تأكد أن إعدادات المشاركة للملف مضبوطة على «أي شخص لديه الرابط» (Anyone with the link).</div>
                                <div>يدعم مستندات Google Docs وملفات PDF و TXT.</div>
                            </div>
                            <label className="block text-sm font-bold text-gray-700">رابط ملف Google Drive *</label>
                            <input
                                type="url"
                                value={driveUrl}
                                onChange={(e) => setDriveUrl(e.target.value)}
                                placeholder="https://docs.google.com/document/d/.../edit"
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-forest text-left font-mono"
                                dir="ltr"
                            />
                        </div>
                    )}

                    {/* Attributes: Grade, Subject, Difficulty */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">الصف الدراسي *</label>
                            <select
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                disabled={targetType === 'exam' && Boolean(activeExam?.grade)}
                                className="input-field bg-gray-50 disabled:opacity-60"
                            >
                                <option value="">اختر الصف</option>
                                {ACTIVE_GRADES.map((g) => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">المادة الدراسية *</label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={targetType === 'exam' && Boolean(activeExam?.subject)}
                                className="input-field bg-gray-50 disabled:opacity-60"
                            >
                                <option value="">اختر المادة</option>
                                {SUBJECTS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">مستوى الصعوبة الافتراضي</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="input-field bg-gray-50"
                            >
                                {DIFFICULTY_OPTS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        onClick={handleParse}
                        disabled={loading}
                        className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50"
                    >
                        {loading ? '⏳ جاري قراءة وتحليل الأسئلة...' : '🔍 تحليل الأسئلة والمعاينة'}
                    </button>
                </div>
            )}

            {/* ── STEP 2: PREVIEW ── */}
            {step === 'preview' && stats && (
                <div className="space-y-5">
                    {/* Stats summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { key: 'all', label: 'إجمالي الأسئلة', value: stats.total, color: 'border-blue-200 bg-blue-50 text-blue-700' },
                            { key: 'valid', label: 'أسئلة صالحة', value: stats.valid, color: 'border-green-200 bg-green-50 text-green-700' },
                            { key: 'invalid', label: 'تحتاج مراجعة', value: stats.invalid, color: 'border-red-200 bg-red-50 text-red-700' },
                            { key: 'duplicates', label: 'أسئلة مكررة', value: stats.duplicates, color: 'border-amber-200 bg-amber-50 text-amber-700' },
                        ].map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setPreviewFilter(s.key as any)}
                                className={`rounded-2xl border p-4 text-center transition-all ${s.color} ${
                                    previewFilter === s.key ? 'ring-2 ring-forest shadow-sm' : 'opacity-80 hover:opacity-100'
                                }`}
                            >
                                <div className="text-2xl font-black">{s.value}</div>
                                <div className="text-xs font-bold mt-1">{s.label}</div>
                            </button>
                        ))}
                    </div>

                    {/* Target info reminder */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-gray-800">
                                {targetType === 'exam' && activeExam
                                    ? `الامتحان المستهدف: «${activeExam.title}»`
                                    : 'الوجهة: بنك الأسئلة العام'}
                            </span>
                            <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold">
                                الصف: {ACTIVE_GRADES.find((g) => g.value === grade)?.label || grade}
                            </span>
                            <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold">
                                المادة: {SUBJECTS.find((s) => s.value === subject)?.label || subject}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-forest">
                            المحدد للاستيراد: {validToImportCount} من {preview.length}
                        </span>
                    </div>

                    {/* Questions preview list */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100 max-h-[65vh] overflow-y-auto">
                        {filteredPreview.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">لا توجد أسئلة تطابق الفلتر المحدد</div>
                        ) : (
                            filteredPreview.map((q) => {
                                const isSkipped = skipped.has(q.index);
                                return (
                                    <div
                                        key={q.index}
                                        className={`p-5 flex gap-4 transition-colors ${
                                            isSkipped ? 'opacity-50 bg-gray-50' : 'bg-white'
                                        }`}
                                    >
                                        {/* Checkbox to include/skip */}
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                checked={!isSkipped}
                                                onChange={() => toggleSkip(q.index)}
                                                className="w-5 h-5 accent-forest cursor-pointer"
                                                title={isSkipped ? 'استبعاد من الاستيراد' : 'محدد للاستيراد'}
                                            />
                                        </div>

                                        <div className="flex-1 space-y-3 min-w-0">
                                            {/* Top badges */}
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                                    <span className="font-bold text-gray-400">#{q.index + 1}</span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded font-bold ${
                                                            q.type === 'essay'
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : q.type === 'true_false'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-green-100 text-green-700'
                                                        }`}
                                                    >
                                                        {q.type === 'essay' ? '✍️ مقالي' : q.type === 'true_false' ? '✅ صح/خطأ' : '🔘 اختيار متعدد'}
                                                    </span>

                                                    {q.isDuplicate && (
                                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                                                            ⚠️ مكرر بقاعدة البيانات
                                                        </span>
                                                    )}

                                                    {!q.valid && (
                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                                                            ❌ {q.error || 'غير صالح'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-gray-500 font-bold">الدرجة:</span>
                                                        <input
                                                            type="number"
                                                            min={0.5}
                                                            step={0.5}
                                                            value={q.points || 1}
                                                            onChange={(e) => updateQuestion(q.index, { points: +e.target.value })}
                                                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs font-bold"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteQuestion(q.index)}
                                                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                                                    >
                                                        🗑️ حذف
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <div>
                                                <textarea
                                                    rows={2}
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.index, { text: e.target.value })}
                                                    className="w-full text-sm font-semibold text-gray-800 border border-gray-200 rounded-xl p-2.5 focus:border-forest outline-none resize-y"
                                                    dir="rtl"
                                                    placeholder="نص السؤال..."
                                                />
                                            </div>

                                            {/* MCQ Choices */}
                                            {q.type === 'mcq' && (
                                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                                    <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-1">
                                                        <span>الخيارات (اختر الإجابة الصحيحة بالضغط على الدائرة):</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => addChoice(q.index)}
                                                            className="text-forest hover:underline"
                                                        >
                                                            + إضافة خيار
                                                        </button>
                                                    </div>
                                                    {q.options?.map((opt, oi) => {
                                                        const isCorrect = q.correctAnswer === opt;
                                                        return (
                                                            <div key={oi} className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`correct-choice-${q.index}`}
                                                                    checked={isCorrect}
                                                                    onChange={() => updateQuestion(q.index, { correctAnswer: opt, correctIndex: oi })}
                                                                    className="w-4 h-4 accent-forest cursor-pointer"
                                                                    title="تحديد كإجابة صحيحة"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newOpts = [...(q.options || [])];
                                                                        newOpts[oi] = e.target.value;
                                                                        const updatedAns = isCorrect ? e.target.value : q.correctAnswer;
                                                                        updateQuestion(q.index, { options: newOpts, correctAnswer: updatedAns });
                                                                    }}
                                                                    className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                                                                        isCorrect
                                                                            ? 'border-green-300 bg-green-50 text-green-900 font-bold'
                                                                            : 'border-gray-200 bg-white text-gray-700'
                                                                    }`}
                                                                />
                                                                {(q.options?.length || 0) > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeChoice(q.index, oi)}
                                                                        className="text-gray-400 hover:text-red-500 text-xs px-1"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* True/False Choices */}
                                            {q.type === 'true_false' && (
                                                <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold">
                                                    <span className="text-gray-600">الإجابة الصحيحة:</span>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`tf-${q.index}`}
                                                            checked={q.correctAnswer === 'صح'}
                                                            onChange={() => updateQuestion(q.index, { correctAnswer: 'صح', correctIndex: 0 })}
                                                            className="accent-forest"
                                                        />
                                                        صح
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`tf-${q.index}`}
                                                            checked={q.correctAnswer === 'خطأ'}
                                                            onChange={() => updateQuestion(q.index, { correctAnswer: 'خطأ', correctIndex: 1 })}
                                                            className="accent-forest"
                                                        />
                                                        خطأ
                                                    </label>
                                                </div>
                                            )}

                                            {/* Essay Fields */}
                                            {q.type === 'essay' && (
                                                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 space-y-2">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-purple-900 mb-1">
                                                            الإجابة النموذجية (اختياري — للمصحح):
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            value={q.modelAnswer || q.correctAnswer || q.answer || ''}
                                                            onChange={(e) => updateQuestion(q.index, { modelAnswer: e.target.value, correctAnswer: e.target.value, answer: e.target.value })}
                                                            className="w-full text-xs border border-purple-200 rounded-lg p-2 bg-white"
                                                            placeholder="اكتب الإجابة النموذجية..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-purple-900 mb-1">
                                                            معايير التصحيح (اختياري):
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={q.gradingCriteria || ''}
                                                            onChange={(e) => updateQuestion(q.index, { gradingCriteria: e.target.value })}
                                                            className="w-full text-xs border border-purple-200 rounded-lg p-2 bg-white"
                                                            placeholder="مثال: درجة لكل سبب يذكره الطالب..."
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Explanation */}
                                            <div>
                                                <input
                                                    type="text"
                                                    value={q.explanation || ''}
                                                    onChange={(e) => updateQuestion(q.index, { explanation: e.target.value })}
                                                    placeholder="شرح الإجابة (اختياري يظهر للطالب بعد الحل)..."
                                                    className="w-full text-xs text-gray-600 border border-gray-100 rounded-lg p-2 focus:border-forest outline-none bg-gray-50/40"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm">
                            <span className="text-gray-500">سيتم حفظ:</span>{' '}
                            <strong className="text-forest text-base">{validToImportCount}</strong> سؤال في{' '}
                            <strong>{targetType === 'exam' && activeExam ? activeExam.title : 'بنك الأسئلة'}</strong>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setStep('input')}
                                className="btn-secondary px-5 py-2.5 text-sm flex-1 sm:flex-initial"
                            >
                                ← تعديل المدخلات
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={loading || validToImportCount === 0}
                                className="btn-primary px-8 py-2.5 text-sm font-bold flex-1 sm:flex-initial disabled:opacity-50"
                            >
                                {loading ? '⏳ جاري الحفظ...' : `📥 تأكيد استيراد ${validToImportCount} سؤال`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 3: DONE ── */}
            {step === 'done' && importResult && (
                <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-10 text-center space-y-4">
                    <div className="text-6xl animate-bounce">🎉</div>
                    <h2 className="text-2xl font-black text-gray-900">تم الاستيراد بنجاح!</h2>
                    <p className="text-gray-600 text-base max-w-md mx-auto">
                        تمت إضافة <strong className="text-forest text-xl font-black">{importResult.count}</strong> سؤال{' '}
                        {importResult.examTitle ? (
                            <>
                                وربطها بالامتحان «<strong>{importResult.examTitle}</strong>» بنجاح.
                            </>
                        ) : (
                            'إلى بنك الأسئلة بنجاح وهي متاحة الآن للاستخدام في الامتحانات وتدريب الطلاب.'
                        )}
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center pt-4">
                        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm font-bold">
                            📥 استيراد المزيد
                        </button>
                        {importResult.examId ? (
                            <Link
                                href={`/admin/exams/${importResult.examId}/questions`}
                                className="btn-secondary px-6 py-2.5 text-sm font-bold"
                            >
                                📝 استعراض أسئلة الامتحان
                            </Link>
                        ) : (
                            <Link href="/admin/questions" className="btn-secondary px-6 py-2.5 text-sm font-bold">
                                🔍 عرض بنك الأسئلة
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function QuestionImportPage() {
    return (
        <Suspense
            fallback={
                <div className="max-w-6xl mx-auto p-8 text-center text-gray-500 animate-pulse">
                    جاري تحميل صفحة استيراد الأسئلة...
                </div>
            }
        >
            <QuestionImportContent />
        </Suspense>
    );
}
