'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SUBJECTS, getSubjectLabel } from '@/lib/constants/subjects';

const TYPE_LABELS: Record<string, string> = { weekly: 'أسبوعي', monthly: 'شهري' };
const TYPE_COLORS: Record<string, string> = {
    weekly: 'bg-purple-100 text-purple-700',
    monthly: 'bg-orange-100 text-orange-700',
};

export default function WeeklyExamsPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');

    useEffect(() => {
        fetch('/api/student/exams?type=weekly')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setExams(res.data.exams);
                else setError(res.message || 'حدث خطأ');
            })
            .catch(() => setError('خطأ في الاتصال'))
            .finally(() => setLoading(false));
    }, []);

    const displayedExams = exams.filter((exam: any) => {
        if (filterSubject === 'all') return true;
        if (!exam.subject || exam.subject === 'uncategorized') return false;
        return exam.subject === filterSubject;
    });

    return (
        <div className="space-y-6 max-w-[850px] mx-auto pt-4">
            <div className="w-full h-[180px] sm:h-[260px] md:h-[320px] rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-sm shadow-gray-200/50 border border-gray-100/50 relative group transition-transform duration-300 hover:scale-[1.01]">
                <img src="/اختبار اسبوعي.jpg" alt="الاختبار الأسبوعي" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none opacity-50" />
            </div>

            <div className="bg-white rounded-[16px] sm:rounded-[20px] shadow-sm border border-gray-100 p-6 animate-fadeIn">
                <h1 className="text-2xl font-black mb-2 text-forest">الاختبارات الأسبوعية</h1>
                <p className="text-gray-500 mb-6">اختبارات أسبوعية لمتابعة مستواك وربح نقاط.</p>

                {/* Subject Filters (Tabs) */}
                <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar border-b border-gray-100 mb-6">
                    <button
                        onClick={() => setFilterSubject('all')}
                        className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${filterSubject === 'all'
                                ? 'bg-forest text-white shadow-md shadow-forest/20'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        كل المواد
                    </button>
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

                {loading && <div className="text-center py-10 text-gray-400 animate-pulse">جاري التحميل...</div>}
                {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>}

                {!loading && !error && displayedExams.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-gray-500 font-medium">لا يوجد اختبارات أسبوعية مطابقة حالياً</p>
                        <p className="text-xs text-gray-400 mt-1">ستظهر هنا بمجرد نشرها من الأدمن</p>
                    </div>
                )}

                {!loading && displayedExams.length > 0 && (
                    <div className="space-y-4">
                        {displayedExams.map((exam: any) => (
                            <div key={exam._id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-forest/10 text-forest border border-forest/20`}>
                                            {getSubjectLabel(exam.subject)}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_COLORS[exam.type]}`}>{TYPE_LABELS[exam.type]}</span>

                                        {exam.attempt && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${exam.attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                سبق وأديته — {exam.attempt.percentage}%
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        ⏱ {exam.duration} دقيقة · {exam.questionCount} سؤال
                                    </p>
                                </div>
                                <Link
                                    href={`/student/exams/${exam._id}`}
                                    className={`btn-primary flex-shrink-0 ${exam.attempt ? 'btn-secondary bg-white text-forest border border-forest' : ''}`}
                                >
                                    {exam.attempt ? 'مراجعة' : 'ابدأ الآن'}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
