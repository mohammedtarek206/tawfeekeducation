'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const SUBJECT_LABLES: Record<string, string> = {
    'history': 'التاريخ',
    'geography': 'الجغرافيا',
    'social_studies': 'الدراسات الاجتماعية'
};

export default function SubjectLessonsPage({ params }: { params: { subject: string } }) {
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch('/api/student/lessons')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const subjectLessons = data.data.lessons.filter((l: any) => l.subject === params.subject);
                    setLessons(subjectLessons);
                } else {
                    setError('حدث خطأ أثناء تحميل الحصص.');
                }
            })
            .catch(() => setError('حدث خطأ أثناء تحميل الحصص.'))
            .finally(() => setLoading(false));
    }, [params.subject]);

    const subjectName = SUBJECT_LABLES[params.subject] || params.subject;

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse p-4">
                <div className="h-10 bg-gray-200 rounded-lg w-1/4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="card h-64 bg-gray-200" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary">إعادة المحاولة</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pt-4">
            <div className="mb-6">
                <h1 className="text-3xl font-black text-gray-900 mb-2">{subjectName}</h1>
                <p className="text-gray-500 text-lg">اكتشف العالم من حولك</p>
            </div>

            {lessons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد حصص متاحة في هذه المادة حاليًا.</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lessons.map((lesson: any) => (
                        <div key={lesson._id} className="card-hover flex flex-col h-full bg-white relative overflow-hidden group rounded-2xl border border-gray-100 shadow-sm">
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {lesson.thumbnail ? (
                                    <img src={lesson.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : lesson.youtubeId ? (
                                    <img src={`https://img.youtube.com/vi/${lesson.youtubeId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />

                                {lesson.duration && (
                                    <div className="absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 bg-black/50 backdrop-blur rounded">
                                        مدة الحصة: {lesson.duration} دقيقة
                                    </div>
                                )}
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-900 text-lg mb-2">{lesson.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                    {lesson.description || 'شرح الحصة...'}
                                </p>
                                <Link href={`/student/lessons/${lesson._id}`} className="btn-secondary w-full text-center">
                                    مشاهدة الحصة
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
