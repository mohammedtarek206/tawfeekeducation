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
    const [lessonsList, setLessonsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editVideo, setEditVideo] = useState<SolutionVideo | null>(null);
    const [form, setForm] = useState<VideoFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [filterGrade, setFilterGrade] = useState('');

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

    const fetchLessons = useCallback(async (selectedGrade: string) => {
        if (!selectedGrade) return;
        try {
            const res = await fetch(`/api/public/lessons?grade=${selectedGrade}`);
            const data = await res.json();
            if (data.success) setLessonsList(data.data.lessons || []);
        } catch {
            console.error('Failed to fetch lessons');
        }
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    useEffect(() => {
        if (form.grade) fetchLessons(form.grade);
    }, [form.grade, fetchLessons]);

    const openAdd = () => {
        setEditVideo(null);
        setForm(EMPTY_FORM);
        setError('');
        setShowModal(true);
    };

    const openEdit = (video: SolutionVideo) => {
        setEditVideo(video);
        const lessonId = typeof video.lesson === 'object' && video.lesson ? video.lesson._id : (video.lesson || '');
        setForm({
            title: video.title,
            description: video.description || '',
            youtubeUrl: video.youtubeUrl,
            grade: video.grade,
            lesson: lessonId,
            isPublished: video.isPublished,
        });
        setError('');
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const url = editVideo
                ? `/api/admin/solution-videos/${editVideo._id}`
                : '/api/admin/solution-videos';
            const method = editVideo ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || 'فشل في الحفظ');
            } else {
                setShowModal(false);
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
            fetchVideos();
        } catch { }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900"><span suppressHydrationWarning>▶️</span> فيديوهات الحل</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة وإضافة فيديوهات الحل على اليوتيوب</p>
                </div>
                <button
                    onClick={openAdd}
                    className="bg-tawfeek-green text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2 shrink-0"
                >
                    + إضافة فيديو جديد
                </button>
            </div>

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
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">المشاهدات</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-600">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {videos.map((video) => {
                                    const ytId = video.youtubeId || extractYouTubeId(video.youtubeUrl);
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

            {/* Modal */}
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

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">رابط اليوتيوب *</label>
                                    <input
                                        type="url"
                                        required
                                        value={form.youtubeUrl}
                                        onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all text-left dir-ltr"
                                        placeholder="https://www.youtube.com/watch?v=..."
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

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الصف الدراسي *</label>
                                    <select
                                        required
                                        value={form.grade}
                                        onChange={e => setForm({ ...form, grade: e.target.value, lesson: '' })}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all"
                                    >
                                        {GRADES.map(g => (
                                            <option key={g.value} value={g.value}>{g.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الحصة / الدرس المرتبط (اختياري)</label>
                                    <select
                                        value={form.lesson}
                                        onChange={e => setForm({ ...form, lesson: e.target.value })}
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-tawfeek-green transition-all"
                                    >
                                        <option value="">بدون ربط (فيديو حل عام)</option>
                                        {lessonsList.map(l => (
                                            <option key={l._id} value={l._id}>
                                                {l.title} ({l.unit || 'بدون وحدة'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

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

                                <div className="flex items-center gap-3 py-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${form.isPublished ? 'bg-tawfeek-green' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isPublished ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <label className="font-bold text-sm text-gray-700 cursor-pointer" onClick={() => setForm({ ...form, isPublished: !form.isPublished })}>
                                        نشر الفيديو الآن
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
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
