'use client';
import { useState, useEffect, useCallback } from 'react';
import { ACTIVE_GRADES } from '@/lib/constants/grades';

const GRADES = ACTIVE_GRADES;

type VideoFormData = {
    title: string;
    description: string;
    youtubeUrl: string;
    grade: string;
    lesson: string;
    isPublished: boolean;
};

const EMPTY_FORM: VideoFormData = {
    title: '',
    description: '',
    youtubeUrl: '',
    grade: 'first_secondary',
    lesson: '',
    isPublished: false,
};

function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
}

type LessonOption = {
    _id: string;
    title: string;
    unit: string;
    grade: string;
    subject?: string;
    lessonNumber?: number;
    isPublished?: boolean;
};

type SolutionVideo = {
    _id: string;
    title: string;
    description?: string;
    youtubeUrl: string;
    youtubeId?: string;
    grade: string;
    lesson?: { _id: string; title: string; unit: string } | string;
    isPublished: boolean;
    viewCount: number;
    createdAt: string;
};

export default function SolutionVideosAdminPage() {
    const [videos, setVideos] = useState<SolutionVideo[]>([]);
    const [lessonsList, setLessonsList] = useState<LessonOption[]>([]);
    const [lessonsLoading, setLessonsLoading] = useState(false);
    const [lessonsError, setLessonsError] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editVideo, setEditVideo] = useState<SolutionVideo | null>(null);
    const [form, setForm] = useState<VideoFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // ─── Fetch solution videos list ───────────────────────────────────────────
    const fetchVideos = useCallback(async () => {
        setLoading(true);
        try {
            const qs = filterGrade ? `?grade=${filterGrade}` : '';
            const res = await fetch(`/api/admin/solution-videos${qs}`);
            const data = await res.json();
            if (data.success) setVideos(data.data.videos);
        } catch {
            console.error('Failed to fetch videos');
        } finally {
            setLoading(false);
        }
    }, [filterGrade]);

    // ─── Fetch lessons for a given grade using ADMIN API ─────────────────────
    // KEY FIX: was using /api/public/lessons which filters by showOnHomepage=true,
    // causing all non-homepage lessons to disappear from the dropdown.
    // Now using /api/admin/lessons which returns all lessons for the grade.
    const fetchLessons = useCallback(async (grade: string): Promise<void> => {
        if (!grade) {
            setLessonsList([]);
            return;
        }
        setLessonsLoading(true);
        setLessonsError('');
        try {
            const res = await fetch(
                `/api/admin/lessons?grade=${encodeURIComponent(grade)}&limit=200&page=1`
            );

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`HTTP ${res.status}: ${txt.slice(0, 100)}`);
            }

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'فشل في جلب الحصص');
            }

            const list: LessonOption[] = (data.data?.lessons ?? []).map((l: any) => ({
                _id: l._id,
                title: l.title,
                unit: l.unit || '',
                grade: l.grade,
                subject: l.subject,
                lessonNumber: l.lessonNumber,
                isPublished: l.isPublished,
            }));

            list.sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));
            setLessonsList(list);
        } catch (err: any) {
            console.error('fetchLessons error:', err);
            setLessonsError(err?.message || 'حدث خطأ أثناء جلب الحصص');
            setLessonsList([]);
        } finally {
            setLessonsLoading(false);
        }
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    // Reload lessons whenever grade changes inside the form
    useEffect(() => {
        if (showModal && form.grade) {
            fetchLessons(form.grade);
        }
    }, [form.grade, showModal, fetchLessons]);

    // ─── Open add modal ───────────────────────────────────────────────────────
    const openAdd = () => {
        setEditVideo(null);
        setForm(EMPTY_FORM);
        setError('');
        setLessonsError('');
        setLessonsList([]);
        setShowModal(true);
        // Fetch lessons for the default grade
        fetchLessons(EMPTY_FORM.grade);
    };

    // ─── Open edit modal ──────────────────────────────────────────────────────
    const openEdit = async (video: SolutionVideo) => {
        setEditVideo(video);
        const lessonId =
            typeof video.lesson === 'object' && video.lesson
                ? video.lesson._id
                : video.lesson || '';

        const newForm: VideoFormData = {
            title: video.title,
            description: video.description || '',
            youtubeUrl: video.youtubeUrl,
            grade: video.grade,
            lesson: lessonId,
            isPublished: video.isPublished,
        };
        setForm(newForm);
        setError('');
        setLessonsError('');
        setLessonsList([]);
        setShowModal(true);
        // Must fetch lessons for the video's grade so the selected lesson appears
        await fetchLessons(video.grade);
    };

    // ─── Save (create or update) ──────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const url = editVideo
                ? `/api/admin/solution-videos/${editVideo._id}`
                : '/api/admin/solution-videos';
            const method = editVideo ? 'PATCH' : 'POST';

            // Send lesson as empty string when not selected — backend handles it
            const body = {
                ...form,
                lesson: form.lesson && form.lesson.trim() !== '' ? form.lesson : undefined,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || 'فشل في الحفظ');
            } else {
                setShowModal(false);
                setSuccessMsg(editVideo ? 'تم تحديث الفيديو بنجاح ✅' : 'تم إضافة الفيديو بنجاح ✅');
                setTimeout(() => setSuccessMsg(''), 4000);
                fetchVideos();
            }
        } catch {
            setError('حدث خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublish = async (video: SolutionVideo) => {
        try {
            await fetch(`/api/admin/solution-videos/${video._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !video.isPublished }),
            });
            fetchVideos();
        } catch { }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            await fetch(`/api/admin/solution-videos/${id}`, { method: 'DELETE' });
            setSuccessMsg('تم الحذف بنجاح');
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchVideos();
        } catch { }
    };

    // ─── Helper: lesson display label ─────────────────────────────────────────
    const lessonLabel = (l: LessonOption): string => {
        const parts: string[] = [];
        if (l.lessonNumber) parts.push(`حصة ${l.lessonNumber}`);
        parts.push(l.title);
        if (l.unit) parts.push(`(${l.unit})`);
        if (!l.isPublished) parts.push('[مسودة]');
        return parts.join(' · ');
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">
                        <span suppressHydrationWarning>▶️</span> فيديوهات الحل
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة وإضافة فيديوهات الحل وربطها بالحصص</p>
                </div>
                <button
                    onClick={openAdd}
                    className="bg-tawfeek-green text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2 shrink-0"
                >
                    + إضافة فيديو جديد
                </button>
            </div>

            {/* Success message */}
            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">
                    {successMsg}
                </div>
            )}

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <label className="font-bold text-gray-700 text-sm shrink-0">تصفية بالصف:</label>
                <select
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-tawfeek-green text-sm font-medium"
                >
                    <option value="">كل الصفوف</option>
                    {GRADES.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                </select>
                <span className="text-sm text-gray-400 font-medium mr-auto">{videos.length} فيديو</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center animate-pulse text-gray-400 font-bold">جاري التحميل...</div>
                ) : videos.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="text-5xl mb-4">🎬</div>
                        <h3 className="font-bold text-gray-700 text-lg mb-2">لا توجد فيديوهات</h3>
                        <p className="text-gray-400 text-sm mb-6">ابدأ بإضافة فيديو حل جديد الآن</p>
                        <button onClick={openAdd} className="bg-tawfeek-green text-white font-bold px-6 py-3 rounded-xl hover:opacity-90">
                            + إضافة فيديو جديد
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">الفيديو</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">الصف</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">الحصة المرتبطة</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">المشاهدات</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {videos.map((video) => {
                                    const ytId = video.youtubeId || extractYouTubeId(video.youtubeUrl);
                                    const linkedLesson = typeof video.lesson === 'object' ? video.lesson : null;
                                    return (
                                        <tr key={video._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    {ytId ? (
                                                        <img
                                                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                                            alt=""
                                                            className="w-20 h-12 rounded-lg object-cover shrink-0 bg-gray-100"
                                                        />
                                                    ) : (
                                                        <div className="w-20 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0" suppressHydrationWarning>▶️</div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 line-clamp-1">{video.title}</p>
                                                        {video.description && (
                                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{video.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                {GRADES.find(g => g.value === video.grade)?.label || video.grade}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {linkedLesson ? (
                                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                                        📖 {linkedLesson.title}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleTogglePublish(video)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${video.isPublished
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {video.isPublished ? '✅ منشور' : '⏸ مسودة'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-bold">
                                                👁 {video.viewCount}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEdit(video)}
                                                        className="text-sm font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        تعديل
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(video._id)}
                                                        className="text-sm font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-gray-900">
                                    {editVideo ? 'تعديل الفيديو' : '+ إضافة فيديو جديد'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition"
                                >
                                    ✕
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-sm font-bold mb-4">
                                    ⚠️ {error}
                                </div>
                            )}

                            <form onSubmit={handleSave} className="space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">العنوان *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all"
                                        placeholder="مثال: حل امتحان الدراسات الاجتماعية 2024"
                                    />
                                </div>

                                {/* YouTube URL */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">رابط اليوتيوب *</label>
                                    <input
                                        type="url"
                                        required
                                        value={form.youtubeUrl}
                                        onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all text-left"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        dir="ltr"
                                    />
                                    {form.youtubeUrl && extractYouTubeId(form.youtubeUrl) && (
                                        <div className="mt-2 rounded-xl overflow-hidden border border-gray-100">
                                            <img
                                                src={`https://img.youtube.com/vi/${extractYouTubeId(form.youtubeUrl)}/mqdefault.jpg`}
                                                alt="معاينة الفيديو"
                                                className="w-full max-h-40 object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Grade */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الصف الدراسي *</label>
                                    <select
                                        required
                                        value={form.grade}
                                        onChange={e => {
                                            setForm({ ...form, grade: e.target.value, lesson: '' });
                                        }}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all"
                                    >
                                        {GRADES.map(g => (
                                            <option key={g.value} value={g.value}>{g.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Lesson picker — KEY FIX */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-bold text-gray-700">
                                            الحصة / الدرس المرتبط
                                            <span className="text-gray-400 font-normal mr-1">(اختياري)</span>
                                        </label>
                                        {lessonsLoading && (
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-tawfeek-green rounded-full animate-spin" />
                                                جاري التحميل...
                                            </span>
                                        )}
                                    </div>

                                    {/* Lessons fetch error */}
                                    {lessonsError && !lessonsLoading && (
                                        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-2">
                                            <span className="text-sm text-orange-700 font-bold">⚠️ {lessonsError}</span>
                                            <button
                                                type="button"
                                                onClick={() => fetchLessons(form.grade)}
                                                className="text-xs font-bold text-orange-600 bg-white border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-50"
                                            >
                                                إعادة المحاولة
                                            </button>
                                        </div>
                                    )}

                                    <select
                                        value={form.lesson}
                                        onChange={e => setForm({ ...form, lesson: e.target.value })}
                                        disabled={lessonsLoading}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all disabled:opacity-60"
                                    >
                                        <option value="">— بدون ربط (فيديو حل عام) —</option>

                                        {!lessonsLoading && !lessonsError && lessonsList.length === 0 && (
                                            <option value="" disabled>
                                                لا توجد حصص مسجلة لهذا الصف بعد
                                            </option>
                                        )}

                                        {lessonsList.map(l => (
                                            <option key={l._id} value={l._id}>
                                                {lessonLabel(l)}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Info badge */}
                                    {!lessonsLoading && !lessonsError && lessonsList.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {lessonsList.length} حصة متاحة لهذا الصف
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">وصف الفيديو (اختياري)</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        rows={3}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all resize-none"
                                        placeholder="اكتب وصفاً مختصراً للفيديو..."
                                    />
                                </div>

                                {/* Publish toggle */}
                                <div className="flex items-center gap-3 py-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${form.isPublished ? 'bg-tawfeek-green' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isPublished ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <label
                                        className="font-bold text-sm text-gray-700 cursor-pointer"
                                        onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                                    >
                                        نشر الفيديو الآن
                                    </label>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving || lessonsLoading}
                                        className="flex-1 bg-tawfeek-green text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                                    >
                                        {saving ? 'جاري الحفظ...' : editVideo ? 'حفظ التعديلات' : 'إضافة الفيديو'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-3.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
