'use client';
import { useState, useEffect } from 'react';
import { useParentContext } from '@/components/parent/ParentContext';
import { gradeLabel } from '@/lib/constants/grades';
import { formatDate } from '@/lib/utils/helpers';
import Link from 'next/link';



export default function ParentDashboardPage() {
    const { selectedStudent, loading: contextLoading } = useParentContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedStudent) return;

        let isMounted = true;
        setLoading(true);

        fetch(`/api/parent/students/${selectedStudent._id}/dashboard`)
            .then(res => res.json())
            .then(resData => {
                if (isMounted && resData.success) {
                    setData(resData.data);
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
                <div className="w-24 h-24 bg-forest/5 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner">👨‍👩‍👧‍👦</div>
                <h2 className="text-2xl font-black text-forest mb-4">أهلاً بك في منصة التوفيق</h2>
                <p className="text-gray-500 font-medium mb-8">ليس لديك أي أبناء مرتبطين بحسابك حالياً. يمكنك البدء بربط حساب طالب.</p>
                <Link href="/parent/link" className="bg-forest text-white font-bold px-8 py-3.5 rounded-xl hover:bg-forest-light transition-all shadow-md">
                    ربط حساب طالب
                </Link>
            </div>
        );
    }

    if (loading || !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-40 bg-gray-200 rounded-3xl" />
                    <div className="h-40 bg-gray-200 rounded-3xl" />
                    <div className="h-40 bg-gray-200 rounded-3xl" />
                </div>
            </div>
        );
    }

    const { overview, recentExams, studentInfo } = data;

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-l from-forest to-forest-light rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl backdrop-blur-md shadow-inner border border-white/30">
                        👨‍🎓
                    </div>
                    <div className="text-center sm:text-right">
                        <h1 className="text-3xl font-black mb-2">{studentInfo.name}</h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                            <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold border border-white/20">
                                {gradeLabel(studentInfo.grade)}
                            </span>
                            <span className="bg-gold/90 text-forest-dark px-4 py-1.5 rounded-full text-sm font-black shadow-md flex items-center gap-1">
                                🌟 {overview.points} نقطة
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white rounded-3xl p-6 border border-earth/30 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-inner">📺</div>
                    <p className="text-sm text-gray-500 font-bold mb-1">الدروس المكتملة</p>
                    <p className="text-2xl font-black text-gray-900">{overview.completedLessons}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-earth/30 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-inner">📝</div>
                    <p className="text-sm text-gray-500 font-bold mb-1">الكويزات</p>
                    <p className="text-2xl font-black text-gray-900">{overview.completedQuizzes}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-earth/30 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-inner">🎯</div>
                    <p className="text-sm text-gray-500 font-bold mb-1">الامتحانات الشاملة</p>
                    <p className="text-2xl font-black text-gray-900">{overview.completedWeeklyExams + overview.completedMonthlyExams}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-earth/30 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-inner">📈</div>
                    <p className="text-sm text-gray-500 font-bold mb-1">متوسط الدرجات</p>
                    <p className="text-2xl font-black text-gray-900">{overview.averageScore}%</p>
                </div>
            </div>

            {/* Recent Activity / Exams */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/30 shadow-sm">
                <h3 className="text-xl font-black text-forest mb-6 flex items-center gap-2">
                    <span>📋</span> آخر الامتحانات
                </h3>

                {recentExams && recentExams.length > 0 ? (
                    <div className="space-y-4">
                        {recentExams.map((exam: any) => (
                            <div key={exam._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-offwhite rounded-2xl border border-earth/20 gap-4">
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">{exam.examRef?.title || 'امتحان بدون عنوان'}</h4>
                                    <div className="text-sm text-gray-500 flex gap-4">
                                        <span suppressHydrationWarning>التاريخ: {formatDate(exam.submittedAt)}</span>
                                        <span className="font-bold text-forest">{exam.examRef?.subject || 'عام'}</span>
                                    </div>

                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${exam.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {exam.passed ? 'ناجح' : 'راسب'}
                                    </div>
                                    <div className="text-xl font-black text-gray-800 dir-ltr">
                                        {exam.percentage}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-2xl border text-gray-500 font-medium">
                        لم يقم الطالب بإجراء أي امتحانات حتى الآن.
                    </div>
                )}
            </div>
        </div>
    );
}
