'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function LessonDetailsPage() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [linkedQuiz, setLinkedQuiz] = useState<any>(null);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/student/lessons/${id}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setData(res.data.lesson);
                    // جلب الكويز المرتبط بهذه الحصة
                    fetch(`/api/student/exams?type=quiz&lessonId=${id}`)
                        .then(r => r.json())
                        .then(qRes => {
                            if (qRes.success && qRes.data?.exams?.length > 0) {
                                setLinkedQuiz(qRes.data.exams[0]);
                            }
                        })
                        .catch(() => { });
                } else {
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
    if (error || !data) return <div className="text-center py-20 font-bold text-red-500">{error || 'عفواً، الحصة غير متاحة.'}</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pt-4">
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

            {/* Video Player */}
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video border border-gray-800">
                {data.youtubeId ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${data.youtubeId}?rel=0&modestbranding=1`}
                        title={data.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full border-0"
                    ></iframe>
                ) : data.youtubeUrl && data.youtubeUrl.includes('drive.google.com') ? (
                    <iframe
                        src={data.youtubeUrl.replace(/\/view.*$/, '/preview')}
                        title={data.title}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full border-0"
                    ></iframe>
                ) : data.youtubeUrl && (data.youtubeUrl.endsWith('.mp4') || data.youtubeUrl.endsWith('.webm')) ? (
                    <video
                        src={data.youtubeUrl}
                        controls
                        className="absolute top-0 left-0 w-full h-full object-contain"
                    />
                ) : data.youtubeUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <a href={data.youtubeUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                            فتح رابط الفيديو الخارجي
                        </a>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <div className="text-5xl mb-2">🎥</div>
                        <p>الفيديو غير متوفر</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-right">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">هل أنهيت ومشاهدة الحصة؟</h3>
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

            {/* Additional Features Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {/* كويز الحصة — إذا كان مرتبطًا يوجه مباشرة للكويز وإلا لقائمة الكويزات */}
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
                        <h4 className="font-bold text-gray-900 mb-1">فيديوهات الحل</h4>
                        <p className="text-xs text-gray-500">شاهد حلول وتفسيرات الأسئلة الصعبة لهذه الحصة.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
