'use client';

import { useEffect, useState } from 'react';
import { getSubjectLabel } from '@/lib/constants/subjects';
import { gradeLabel } from '@/lib/constants/grades';

export default function AdminStudentMistakesPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/student-mistakes')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">سجل أخطاء الطلاب العامة</h1>
                <p className="text-gray-500 mt-1">متابعة تحليلات الأسئلة الشائعة والأكثر صعوبة على المنصة</p>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400 animate-pulse">جاري تحميل البيانات...</div>
            ) : !data || !data.topMistakenQuestions || data.topMistakenQuestions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="text-5xl mb-3">📊</div>
                    <p className="text-gray-500 font-medium">لا توجد بيانات أخطاء مسجلة بعد</p>
                    <p className="text-xs text-gray-400 mt-1">ستظهر الإحصائيات بمجرد إكمال الطلاب للاختبارات</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-bold text-amber-900">إجمالي الأخطاء المسجلة في النظام</h3>
                                <p className="text-xs text-amber-700">الأسئلة أدناه ترتب حسب أكثر الأسئلة خطأً لدى الطلاب</p>
                            </div>
                        </div>
                        <span className="text-xl font-black text-amber-900 bg-white px-4 py-1.5 rounded-xl border border-amber-200 shadow-sm">
                            {data.totalMistakesRecorded} خطأ
                        </span>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900">
                            أكثر 50 سؤالاً أخطأ فيه الطلاب
                        </div>

                        <div className="divide-y divide-gray-50">
                            {data.topMistakenQuestions.map((q: any, i: number) => (
                                <div key={q._id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="px-2.5 py-0.5 rounded bg-forest text-white text-[11px] font-bold">
                                                    {getSubjectLabel(q.subject)}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-bold">
                                                    {gradeLabel(q.grade)}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded bg-red-100 text-red-700 text-[11px] font-bold">
                                                    عدد الأخطاء: {q.errorCount}
                                                </span>
                                            </div>

                                            <p className="font-bold text-gray-900 mb-1">
                                                <span className="text-gray-400 font-normal ml-2">#{i + 1}</span>
                                                {q.text}
                                            </p>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-xs text-gray-500 font-bold block">الطلاب المتأثرون</span>
                                            <span className="text-lg font-black text-forest">{q.affectedStudentsCount} طالب</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
