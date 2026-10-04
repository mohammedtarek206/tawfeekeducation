'use client';
import { useState, useEffect } from 'react';
import { useParentContext } from '@/components/parent/ParentContext';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/helpers';


export default function ParentResultsPage() {
    const { selectedStudent, loading: contextLoading } = useParentContext();
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'quizzes' | 'weekly' | 'monthly'>('quizzes');

    useEffect(() => {
        if (!selectedStudent) return;

        let isMounted = true;
        setLoading(true);

        fetch(`/api/parent/students/${selectedStudent._id}/results`)
            .then(res => res.json())
            .then(resData => {
                if (isMounted && resData.success) {
                    setResults(resData.data.results);
                }
            })
            .catch(err => console.error(err))
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [selectedStudent]);

    if (contextLoading) {
        return <div className="flex justify-center items-center h-64 text-forest font-bold text-xl">جاري التحميل...</div>;
    }

    if (!selectedStudent) {
        return (
            <div className="flex flex-col items-center justify-center bg-white rounded-3xl p-12 border border-earth/30 text-center max-w-2xl mx-auto mt-12 shadow-sm">
                <h2 className="text-2xl font-black text-forest mb-4">النتائج والمستوى</h2>
                <p className="text-gray-500 font-medium mb-8">يرجى ربط حساب طالب أولاً ليتم عرض استمارة درجاته.</p>
                <Link href="/parent/link" className="bg-forest text-white font-bold px-8 py-3.5 rounded-xl hover:bg-forest-light transition-all shadow-md">
                    ربط حساب طالب
                </Link>
            </div>
        );
    }

    if (loading || !results) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded-2xl w-full max-w-md mx-auto" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    const currentData = results[activeTab] || [];

    const tabs = [
        { id: 'quizzes', label: 'كويزات الحصص', count: results.quizzes.length },
        { id: 'weekly', label: 'الاختبارات الأسبوعية', count: results.weekly.length },
        { id: 'monthly', label: 'الامتحانات الشهرية', count: results.monthly.length },
    ] as const;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black text-forest flex items-center gap-2">
                <span>📝</span> السجل الأكاديمي والدرجات
            </h1>

            {/* Tabs */}
            <div className="bg-white p-2 border border-earth/30 rounded-2xl flex flex-wrap gap-2 shadow-sm">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${activeTab === tab.id
                            ? 'bg-forest text-white shadow-md'
                            : 'bg-transparent text-gray-500 hover:bg-offwhite hover:text-forest'
                            }`}
                    >
                        {tab.label} <span className="text-xs bg-black/10 px-2 py-0.5 rounded-full mr-1">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/30 shadow-sm min-h-[400px]">
                {currentData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {currentData.map((exam: any) => (
                            <div key={exam._id} className="bg-offwhite border border-earth/30 rounded-2xl p-5 hover:border-forest/50 transition-all flex flex-col justify-between">
                                <div className="mb-4">
                                    <h3 className="font-black text-gray-900 text-lg mb-1 line-clamp-2">
                                        {exam.examRef?.title || 'اختبار بدون اسم'}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium">مادة: {exam.examRef?.subject || 'عام'}</p>
                                </div>
                                <div className="flex items-end justify-between border-t border-earth/30 pt-4 mt-auto">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">نتيجة التقييم</div>
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-black text-center ${exam.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {exam.passed ? 'مجتاز' : 'غير مجتاز'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 mb-1">النسبة المئوية</div>
                                        <div className="text-3xl font-black text-gray-900 dir-ltr">{exam.percentage}%</div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 mt-4 text-left" suppressHydrationWarning>
                                    تاريخ الأداء: {formatDate(exam.submittedAt)}
                                </div>

                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="text-6xl mb-4 opacity-50">📂</div>
                        <h3 className="text-lg font-bold">لا يوجد سجلات حالياً</h3>
                        <p className="text-sm font-medium mt-1">لم بقم الطالب بأداء هذا النوع من التقييمات بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
