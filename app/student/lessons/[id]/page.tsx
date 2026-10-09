'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/shared/VideoPlayer';
import BlockedContentCard from '@/components/shared/BlockedContentCard';

export default function LessonDetailsPage() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [studentName, setStudentName] = useState<string>('');
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blockedReason, setBlockedReason] = useState<string | null>(null);
    const [linkedQuiz, setLinkedQuiz] = useState<any>(null);
    const [solutionVideos, setSolutionVideos] = useState<any[]>([]);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/student/lessons/${id}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setData(res.data.lesson);
                    setStudentName(res.data.studentName || '');
                    // Fetch linked quiz
                    fetch(`/api/student/exams?type=quiz&lessonId=${id}`)
                        .then((r) => r.json())
                        .then((qRes) => {
                            if (qRes.success && qRes.data?.exams?.length > 0) {
                                setLinkedQuiz(qRes.data.exams[0]);
                            }
                        })
                        .catch(() => { });

                    // Fetch linked solution videos
                    fetch(`/api/student/solution-videos?lessonId=${id}`)
                        .then((r) => r.json())
                        .then((sRes) => {
                            if (sRes.success) {
                                setSolutionVideos(sRes.data?.videos || []);
                            }
                        })
                        .catch(() => { });
                } else {
                    if (res.requireSubscription || res.reason) {
                        setBlockedReason(res.reason || 'no_subscription');
                    }
                    setError(res.message || 'الحصة غير موجودة');
                }
            })
            .catch(() => setError('خطأ في الاتصال'))
            .finally(() => setLoading(false));
    }, [id]);

    const markAsCompleted = async () => {
        if (!data) return;
        try {
            const res = await fetch('/api/student/lessons/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId: data._id, watchedPercentage: 100 }),
            });
            const result = await res.json();
            if (result.success) {
                setProgress(result.data);
                if (result.data.pointsAwarded) {
                    alert('تم تسجيل إتمام الحصة وحصلت على النقاط!');
                } else {
                    alert('تم تسجيل إتمام الحصة!');
                }
            }
        } catch {
            alert('حدث خطأ');
        }
    };

    if (loading) return <div className="animate-pulse h-96 bg-gray-200 rounded-2xl max-w-5xl mx-auto mt-6" />;

    if (blockedReason) {
        return (
            <div className="max-w-5xl mx-auto pt-6 px-4">
                <BlockedContentCard reason={blockedReason} message={error} />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-20 font-bold text-rose-500 max-w-5xl mx-auto">
                {error || 'عفواً، الحصة غير متاحة.'}
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pt-4 pb-20">
            <div className="flex items-center gap-4 text-sm text-gray-500">
                <Link href="/student/lessons" className="hover:text-tawfeek-green transition-colors font-bold">الحصص</Link>
                <span>/</span>
                <span>الوحدة: {data.unit}</span>
            </div>

            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 leading-tight">{data.title}</h1>
                    <p className="text-gray-600">{data.description || 'لا يوجد وصف للحصة.'}</p>
                </div>
                <div className="bg-tawfeek-green/10 text-tawfeek-green px-4 py-2 rounded-xl font-black text-center border border-tawfeek-green/20 flex-shrink-0">
                    <div className="text-xs text-tawfeek-green/70 mb-0.5">النقاط</div>
                    +{data.points || 10}
                </div>
            </div>

            {/* Interactive Video Player with Watermark */}
            <VideoPlayer
                src={data.videoUrl}
                youtubeId={data.youtubeId}
                youtubeUrl={data.youtubeUrl}
                title={data.title}
                studentName={studentName}
            />

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-right">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">هل أنهيت مشاهدة الحصة؟</h3>
                    <p className="text-sm text-gray-500 max-w-lg">
                        تأكد من استكمال الشرح لضمان تحصيلك الكامل، ستُمنح النقاط بمجرد التأكيد.
                    </p>
                </div>

                <button
                    onClick={markAsCompleted}
                    disabled={progress?.isCompleted}
                    className={`btn-primary flex items-center justify-center gap-2 px-6 disabled:opacity-75 disabled:bg-tawfeek-green disabled:text-white disabled:cursor-default w-full sm:w-auto`}
                >
                    <span className="text-xl">✓</span>
                    {progress?.isCompleted ? 'تم إتمام الحصة' : 'تأكيد إتمام المشاهدة'}
                </button>
            </div>

            {/* Linked Solution Videos Section */}
            {solutionVideos.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-gold/30 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <span>💡</span>
                                <span>فيديو الحل والتدريبات لهذه الحصة</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">شاهد الحل المنهجي والخطوات بالتفصيل للتمارين والأسئلة الخاصة بهذه الحصة</p>
                        </div>
                        <Link
                            href={`/student/solution-videos?lessonId=${data._id}`}
                            className="text-xs font-bold text-tawfeek-green bg-tawfeek-green/10 hover:bg-tawfeek-green/20 px-3.5 py-2 rounded-xl transition-all"
                        >
                            عرض الكل ↗
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {solutionVideos.map((sVideo) => (
                            <Link
                                key={sVideo._id}
                                href={`/student/solution-videos?lessonId=${data._id}`}
                                className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gold/50 bg-gray-50 hover:bg-white transition-all shadow-xs"
                            >
                                <div className="w-20 h-14 rounded-lg bg-black/90 overflow-hidden relative shrink-0">
                                    {sVideo.youtubeId ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${sVideo.youtubeId}/mqdefault.jpg`}
                                            alt={sVideo.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl text-white">🎬</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="w-7 h-7 rounded-full bg-tawfeek-green text-white flex items-center justify-center text-xs">▶</div>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-tawfeek-green transition-colors">
                                        {sVideo.title}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                        {sVideo.description || 'شاهد الحل والتدريبات'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional Features Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <Link
                    href={linkedQuiz ? `/student/exams/${linkedQuiz._id}` : `/student/lesson-quizzes`}
                    className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex items-center p-4 gap-4"
                >
                    <div className="w-16 h-16 bg-forest/10 rounded-lg flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                        📝
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-1">اختبار الحصة</h4>
                        <p className="text-xs text-gray-500">
                            {linkedQuiz
                                ? `${linkedQuiz.questionCount ?? linkedQuiz.questions?.length ?? '?'} سؤال · ${linkedQuiz.duration} دقيقة`
                                : 'اختبر فهمك لمحتوى هذه الحصة'}
                        </p>
                    </div>
                    {linkedQuiz && (
                        <span className="mr-auto text-xs font-bold text-forest bg-forest/10 px-2 py-1 rounded">
                            ابدأ
                        </span>
                    )}
                </Link>

                <Link href={`/student/solution-videos?lessonId=${data._id}`} className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gold/50 transition-all shadow-sm hover:shadow-md flex items-center p-4 gap-4">
                    <div className="w-16 h-16 bg-gold/10 rounded-lg flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                        💡
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-1">فيديوهات الحل والتدريبات</h4>
                        <p className="text-xs text-gray-500">شاهد حلول وتفسيرات الأسئلة الصعبة لهذه الحصة.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}

