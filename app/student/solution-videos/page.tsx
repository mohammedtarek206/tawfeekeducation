'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/shared/VideoPlayer';
import BlockedContentCard from '@/components/shared/BlockedContentCard';

type SolutionVideo = {
    _id: string;
    title: string;
    description?: string;
    youtubeUrl: string;
    youtubeId?: string;
    grade: string;
    lesson?: { _id: string; title: string; unit: string };
    viewCount: number;
    createdAt: string;
};

export default function StudentSolutionVideosPage() {
    const searchParams = useSearchParams();
    const lessonIdParam = searchParams.get('lessonId');

    const [videos, setVideos] = useState<SolutionVideo[]>([]);
    const [studentName, setStudentName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blockedReason, setBlockedReason] = useState<string | null>(null);
    const [activeVideo, setActiveVideo] = useState<SolutionVideo | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchSolutionVideos = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const qs = lessonIdParam ? `?lessonId=${lessonIdParam}` : '';
            const res = await fetch(`/api/student/solution-videos${qs}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (data.requireSubscription || data.reason) {
                    setBlockedReason(data.reason || 'no_subscription');
                }
                setError(data.message || 'فشل في تحميل فيديوهات الحل');
            } else {
                setVideos(data.data.videos || []);
                setStudentName(data.data.studentName || '');
                if (data.data.videos?.length > 0 && lessonIdParam) {
                    setActiveVideo(data.data.videos[0]);
                }
            }
        } catch {
            setError('حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    }, [lessonIdParam]);

    useEffect(() => {
        fetchSolutionVideos();
    }, [fetchSolutionVideos]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pt-4">
                <div className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-40 bg-gray-200 animate-pulse rounded-xl" />
                    <div className="h-40 bg-gray-200 animate-pulse rounded-xl" />
                </div>
            </div>
        );
    }

    if (blockedReason) {
        return (
            <div className="max-w-5xl mx-auto pt-6 px-4">
                <BlockedContentCard reason={blockedReason} message={error} />
            </div>
        );
    }

    const filteredVideos = videos.filter(
        (v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.lesson?.title && v.lesson.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pt-4 pb-20 animate-fadeIn" dir="rtl">
            {/* Header Banner */}
            <div className="w-full h-[180px] sm:h-[240px] rounded-2xl overflow-hidden shadow-lg border border-gray-100 relative group">
                <img
                    src="/فيديوهات الحل.jpg"
                    alt="غلاف صفحة فيديوهات الحل"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6 sm:p-8">
                    <div className="text-white">
                        <span className="bg-tawfeek-green text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block shadow">
                            مكتبة التمارين المفسرة 💡
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black">فيديوهات الحل وتفسير الأسئلة</h1>
                        <p className="text-xs sm:text-sm text-gray-200 mt-1 max-w-xl">
                            شاهد الشرح الخطوي لحلول تمارين الدروس والكتب الخارجية والامتحانات.
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Video Player View (if selected) */}
            {activeVideo && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <span className="text-xs font-bold text-tawfeek-green bg-tawfeek-green/10 px-2.5 py-1 rounded-md">
                                جاري العرض الان 🎬
                            </span>
                            <h2 className="text-xl font-black text-gray-900 mt-1">{activeVideo.title}</h2>
                        </div>

                        {/* Back to Explanation Lesson Link Card */}
                        {activeVideo.lesson && typeof activeVideo.lesson === 'object' && activeVideo.lesson._id && (
                            <Link
                                href={`/student/lessons/${activeVideo.lesson._id}`}
                                className="bg-tawfeek-green text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2"
                            >
                                <span>📖</span>
                                <span>الرجوع إلى فيديو الشرح</span>
                            </Link>
                        )}
                    </div>

                    <VideoPlayer
                        youtubeUrl={activeVideo.youtubeUrl}
                        youtubeId={activeVideo.youtubeId}
                        title={activeVideo.title}
                        studentName={studentName}
                    />

                    {activeVideo.description && (
                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
                            <strong>تفاصيل الشرح:</strong> {activeVideo.description}
                        </div>
                    )}
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-72 relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن فيديو حل أو عنوان..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tawfeek-green transition-all"
                    />
                </div>
                <div className="text-xs text-gray-400 font-bold">
                    إجمالي الفيديوهات المتاحة: {filteredVideos.length} فيديو
                </div>
            </div>

            {/* Videos Grid */}
            {filteredVideos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
                    <div className="text-5xl">🎬</div>
                    <h3 className="font-bold text-gray-700 text-lg">لا توجد فيديوهات حل حتى الآن</h3>
                    <p className="text-gray-400 text-sm">سيقوم المعلم بإضافة فيديوهات حل مخصصة لصفك قريباً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredVideos.map((video) => {
                        const isSelected = activeVideo?._id === video._id;
                        return (
                            <div
                                key={video._id}
                                onClick={() => {
                                    setActiveVideo(video);
                                    window.scrollTo({ top: 250, behavior: 'smooth' });
                                }}
                                className={`group bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md ${isSelected ? 'border-tawfeek-green ring-2 ring-tawfeek-green/20' : 'border-gray-100 hover:border-tawfeek-green/40'
                                    }`}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-black/90 overflow-hidden">
                                    {video.youtubeId ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">🎥</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-tawfeek-green/90 text-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                                            ▶
                                        </div>
                                    </div>
                                    {video.lesson?.title && (
                                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20">
                                            {video.lesson.title}
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="p-4 space-y-2">
                                    <h3 className="font-black text-gray-900 line-clamp-1 group-hover:text-tawfeek-green transition-colors">
                                        {video.title}
                                    </h3>
                                    {video.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                            {video.description}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[11px] text-gray-400 font-bold">
                                        <span>👁 {video.viewCount || 0} مشاهدة</span>
                                        <span className="text-tawfeek-green group-hover:underline">مشاهدة الآن ↗</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
