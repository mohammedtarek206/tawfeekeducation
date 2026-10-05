'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// الجغرافيا مؤرشفة — محذوفة من قائمة الفلاتر
const SUBJECTS = [
    { value: 'all', label: 'كل المواد' },
    { value: 'history', label: 'التاريخ' },
    { value: 'social_studies', label: 'الدراسات الاجتماعية' },
];

export default function StudentLessonsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState('all');

    useEffect(() => {
        fetch('/api/student/lessons')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-gray-200 rounded-lg w-1/4" />
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-gray-200 rounded-full" />)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="card h-64" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data?.lessons) return <div className="text-center py-10">حدث خطأ في جلب البيانات</div>;

    const displayedLessons = data.lessons.filter((lesson: any) => {
        if (filterSubject === 'all') return true;
        // Group uncategorized with some default or exclude them if specific subject is chosen
        if (!lesson.subject || lesson.subject === 'uncategorized' || lesson.subject === 'رياضيات') return false;
        return lesson.subject === filterSubject;
    });

    const getSubjectLabel = (val: string) => {
        return SUBJECTS.find(s => s.value === val)?.label || 'غير مصنف';
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الحصص التعليمية</h1>
                    <p className="text-gray-500 mt-1">تابع كل الدروس الجديدة والمستمرة حسب المادة</p>
                </div>
            </div>

            {/* Subject Filters (Tabs) */}
            <div className="flex gap-2 py-2 overflow-x-auto hide-scrollbar border-b border-gray-100 mb-6">
                {SUBJECTS.map((sub) => (
                    <button
                        key={sub.value}
                        onClick={() => setFilterSubject(sub.value)}
                        className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${filterSubject === sub.value
                            ? 'bg-forest text-white shadow-md shadow-forest/20'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {sub.label}
                    </button>
                ))}
            </div>

            {displayedLessons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد حصص حاليًا في هذا القسم</h3>
                    <p className="text-gray-500">سيتم إضافة محتوى لصفك الدراسي قريباً</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedLessons.map((lesson: any) => {
                        const progress = lesson.progress;
                        const isCompleted = progress?.isCompleted;
                        const watchedPercentage = progress?.watchedPercentage || 0;

                        return (
                            <div key={lesson._id} className="card-hover flex flex-col h-full bg-white relative overflow-hidden group">
                                {isCompleted && (
                                    <div className="absolute top-4 left-4 z-10 w-8 h-8 bg-tawfeek-green text-white rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                                        ✓
                                    </div>
                                )}

                                {/* Thumbnail */}
                                <div className="h-48 bg-gray-100 -mt-6 -mx-6 mb-4 relative overflow-hidden">
                                    <div className="absolute top-2 right-2 z-10">
                                        <span className="px-3 py-1 rounded bg-black/60 backdrop-blur text-xs font-bold text-white shadow-sm border border-white/10">
                                            {getSubjectLabel(lesson.subject)}
                                        </span>
                                    </div>

                                    {lesson.thumbnail ? (
                                        <img
                                            src={lesson.thumbnail}
                                            alt=""
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <img
                                            src={`https://img.youtube.com/vi/${lesson.youtubeId}/mqdefault.jpg`}
                                            alt=""
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%23e2e8f0"/></svg>';
                                            }}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                                    <div className="absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 bg-black/50 backdrop-blur rounded flex items-center gap-1">
                                        ⏱ {lesson.duration || 0} د
                                    </div>

                                    <div className="absolute bottom-3 right-3 text-white text-xs font-bold px-2 py-1 bg-tawfeek-green/90 backdrop-blur rounded">
                                        حصة {lesson.lessonNumber}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col">
                                    <div className="text-xs text-tawfeek-green font-bold mb-2">الوحدة: {lesson.unit}</div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight">
                                        {lesson.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                        {lesson.description || 'لا يوجد وصف متاح لهذه الحصة.'}
                                    </p>

                                    {/* Progress */}
                                    {progress ? (
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className={isCompleted ? 'text-tawfeek-green' : 'text-gray-500'}>
                                                    {isCompleted ? 'مكتمل' : 'قيد المشاهدة'}
                                                </span>
                                                <span className="text-gray-500">{Math.round(watchedPercentage)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-tawfeek-green' : 'bg-tawfeek-gold'}`}
                                                    style={{ width: `${watchedPercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-4 border border-dashed border-gray-200 rounded-lg p-2 text-center text-xs text-gray-500">
                                            لم تبدأ مشاهدة هذه الحصة بعد
                                        </div>
                                    )}

                                    <Link
                                        href={`/student/lessons/${lesson._id}`}
                                        className="btn-secondary w-full text-center group-hover:bg-tawfeek-green group-hover:text-white transition-colors"
                                    >
                                        {progress ? (isCompleted ? 'مراجعة الحصة' : 'متابعة المشاهدة') : 'بدء الحصة 🚀'}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
