'use client';
import { useState, useEffect } from 'react';
import { useParentContext } from '@/components/parent/ParentContext';
import Link from 'next/link';

function timeAgo(dateString: string) {
    if (!dateString) return 'غير محدد';
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' سنة';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' شهر';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' يوم';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' ساعة';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' دقيقة';
    return Math.floor(seconds) + ' ثانية';
}

export default function ParentActivityPage()   {
    const { selectedStudent, loading: contextLoading } = useParentContext();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedStudent) return;

        let isMounted = true;
        setLoading(true);

        fetch(`/api/parent/students/${selectedStudent._id}/activity`)
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
                <h2 className="text-2xl font-black text-forest mb-4">النشاط الأكاديمي</h2>
                <p className="text-gray-500 font-medium mb-8">يرجى ربط حساب طالب أولاً.</p>
                <Link href="/parent/link" className="bg-forest text-white font-bold px-8 py-3.5 rounded-xl hover:bg-forest-light transition-all shadow-md">
                    ربط حساب طالب
                </Link>
            </div>
        );
    }

    if (loading || !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded-2xl w-full max-w-md" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    const activities = data.activities || [];

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-forest flex items-center gap-2">
                    <span>⏱️</span> النشاط والمتابعة الزمنية
                </h1>
                {data.lastLogin && (
                    <div className="bg-white border border-earth/30 px-4 py-2 rounded-xl text-sm text-gray-500 font-bold shadow-sm">
                        آخر دخول: <span className="text-forest">{timeAgo(data.lastLogin)}</span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth/30 shadow-sm relative">
                {activities.length > 0 ? (
                    <div className="relative border-r-2 border-forest/20 pr-6 mr-4 space-y-8 py-4">
                        {activities.map((activity: any, index: number) => {
                            const isCompleted = activity.isCompleted;
                            return (
                                <div key={activity._id} className="relative">
                                    <div className={`absolute -right-[35px] w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center
                                        ${isCompleted ? 'bg-green-500' : 'bg-gold'}
                                    `} />
                                    <div className="bg-offwhite border border-earth/40 rounded-2xl p-5 shadow-sm hover:border-forest/40 transition-colors">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="font-bold text-gray-900 text-lg">
                                                {activity.lesson?.title || 'درس محذوف'}
                                            </h3>
                                            <span className="text-xs text-gray-400 shrink-0 mt-1 font-medium bg-gray-100 px-2 py-1 rounded-md">
                                                منذ {timeAgo(activity.updatedAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-forest font-bold mb-4">{activity.lesson?.subject || 'مادة عامة'}</p>

                                        <div className="flex items-center justify-between mt-auto border-t border-earth/20 pt-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {isCompleted ? 'اكتمل الدرس' : 'قيد المشاهدة'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 mb-1">نسبة المشاهدة</div>
                                                <div className="font-black text-gray-700 dir-ltr">{activity.watchedPercentage}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="text-5xl mb-4 opacity-50">🧭</div>
                        <h3 className="text-lg font-bold">لا يوجد أي نشاط</h3>
                        <p className="text-sm font-medium mt-1">لم يبدأ الطالب في مشاهدة أي دروس بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
