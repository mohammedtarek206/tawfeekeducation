'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Using exact type logic to map data easily
type DashboardData = any;

export default function StudentDashboardOverview() {
    const [data, setData] = useState<DashboardData>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/student/dashboard')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="skeleton h-32 w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24" />)}
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center py-10">حدث خطأ في جلب البيانات</div>;

    const { student, stats, lastLesson, upcomingExams, unreadNotifications } = data;

    // Calculate completion percentage
    const completionPercentage = stats.totalLessons > 0
        ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
        : 0;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Welcome Widget */}
            <div className="bg-gradient-to-l from-forest to-forest-light rounded-2xl p-6 sm:p-8 text-white shadow-forest relative overflow-hidden">
                <div className="absolute inset-0 geo-grid-bg opacity-10 pointer-events-none" />
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-gold/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-2">
                            <span>مرحباً، {student.name.split(' ')[0]}</span>
                            <span className="text-xl">🧭</span>
                        </h1>
                        <p className="text-white/80">
                            استمر في الاستكشاف! لديك الآن <span className="font-bold text-gold px-1">{student.points}</span> نقطة جغرافية.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {lastLesson ? (
                            <Link href={`/student/lessons/${lastLesson._id}`} className="btn-gold shadow-gold-sm">
                                ▶️ استكمال آخر درس
                            </Link>
                        ) : (
                            <Link href={`/student/lessons`} className="btn-gold shadow-gold-sm">
                                📚 ابدأ المذاكرة
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard title="الدروس المكتملة" value={stats.completedLessons} sub={`${stats.totalLessons} إجمالي`} icon="🗺️" color="bg-geo/10 text-geo" />
                <StatCard title="متوسط الاختبارات" value={`${stats.avgScore}%`} sub={`${stats.examCount} اختبار`} icon="📈" color="bg-forest/10 text-forest" />
                <StatCard title="المستوى الحالي" value={student.level} sub="مستكشف معتمد" icon="⭐" color="bg-gold/10 text-gold-dark" />
                <StatCard title="أيام متتالية" value={student.streak} sub="مداومة" icon="🔥" color="bg-earth/20 text-earth-dark" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress & Next Lesson */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">التقدم في المنهج</h3>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 text-sm">مكتمل</span>
                            <span className="font-bold">{completionPercentage}%</span>
                        </div>
                        <div className="progress-bar mb-4">
                            <div
                                className="progress-fill"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg">آخر درس فتحته</h3>
                            <Link href="/student/lessons" className="text-forest text-sm font-semibold hover:underline">عرض كل الدروس</Link>
                        </div>

                        {lastLesson ? (
                            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl">
                                <div className="w-16 h-12 bg-earth-light/30 rounded-lg flex-shrink-0 overflow-hidden border border-earth/20">
                                    {lastLesson.thumbnail ? (
                                        <img src={lastLesson.thumbnail} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-forest text-white text-xs">محتوى</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 line-clamp-1">{lastLesson.title}</h4>
                                    <p className="text-xs text-gray-500">الوحدة: {lastLesson.unit}</p>
                                </div>
                                <Link href={`/student/lessons/${lastLesson._id}`} className="btn-secondary btn-sm rounded-lg shrink-0">
                                    مشاهدة
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-xl">
                                لم تبدأ مشاهدة أي درس بعد
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panel: Exams & Referral */}
                <div className="space-y-6">
                    {/* NEW FEATURES SECTION */}
                    <div className="card bg-gray-50/50">
                        <h3 className="font-bold text-lg mb-4 text-forest">استكشف المزيد</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link href="/student/lesson-quizzes" className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="w-full h-24 overflow-hidden relative">
                                    <img src="/اختبار الحصه.jpg" alt="اختبارات الحصص" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">اختبارات الحصص</h4>
                                    <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-2">اختبر فهمك للحصة.</p>
                                    <span className="text-xs font-bold text-forest">الاختبار ←</span>
                                </div>
                            </Link>

                            <Link href="/student/solution-videos" className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="w-full h-24 overflow-hidden relative">
                                    <img src="/فيديوهات الحل.jpg" alt="فيديوهات الحل" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">فيديوهات الحل</h4>
                                    <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-2">شاهد الحلول وراجع إجاباتك.</p>
                                    <span className="text-xs font-bold text-forest">استكشف ←</span>
                                </div>
                            </Link>

                            <Link href="/student/weekly-exams" className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="w-full h-24 overflow-hidden relative">
                                    <img src="/اختبار اسبوعي.jpg" alt="الاختبار الأسبوعي" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">الاختبار الأسبوعي</h4>
                                    <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-2">اختبر مستواك أسبوعياً.</p>
                                    <span className="text-xs font-bold text-forest">الاختبار ←</span>
                                </div>
                            </Link>

                            <Link href="/student/monthly-exams" className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="w-full h-24 overflow-hidden relative">
                                    <img src="/اختبار الشهري.jpg" alt="الاختبار الشهري" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">الاختبار الشهري</h4>
                                    <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-2">قيّم مستواك في المنهج.</p>
                                    <span className="text-xs font-bold text-forest">الاختبار ←</span>
                                </div>
                            </Link>

                            <Link href="/student/study-notes" className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="w-full h-24 overflow-hidden relative">
                                    <img src="/مذكره سوال وجواب-.jpg" alt="مذكرات سؤال وجواب" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">مذكرات مراجعة</h4>
                                    <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-2">مذكرات تساعدك.</p>
                                    <span className="text-xs font-bold text-forest">فتح المذكرة ←</span>
                                </div>
                            </Link>

                            <Link href="/student/ask-master" className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="w-full h-24 overflow-hidden relative">
                                    <img src="/اسال المستر.jpg" alt="اسأل المستر" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">اسأل المستر</h4>
                                    <p className="text-xs text-gray-500 mb-2 flex-1 line-clamp-2">عندك سؤال؟ اسأل.</p>
                                    <span className="text-xs font-bold text-forest">Chatbot ←</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4 flex justify-between">
                            امتحانات قادمة
                            {upcomingExams.length > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold">{upcomingExams.length}</span>}
                        </h3>

                        {upcomingExams.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingExams.map((exam: any) => (
                                    <div key={exam._id} className="border border-earth/40 rounded-xl p-3 hover:border-forest transition-colors bg-offwhite/50">
                                        <h4 className="font-bold text-sm mb-1 line-clamp-1">{exam.title}</h4>
                                        <p className="text-xs text-muted mb-2">
                                            المدة: {exam.duration} دقيقة
                                        </p>
                                        <Link href={`/student/exams/${exam._id}`} className="block w-full text-center bg-white border border-earth/50 text-forest text-xs font-bold py-2 rounded-lg hover:bg-forest hover:text-white transition-colors">
                                            دخول الامتحان
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                لا توجد امتحانات قادمة
                            </div>
                        )}
                    </div>

                    <div className="card bg-gradient-to-br from-offwhite to-white border-gold/30 relative overflow-hidden">
                        <div className="absolute inset-0 contour-bg opacity-30 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="text-3xl mb-2">🧭</div>
                            <h3 className="font-bold text-lg mb-1 text-forest">اكسب نقاط جغرافيا!</h3>
                            <p className="text-sm text-muted mb-4">
                                شارك كود الدعوة بتاعك مع صحابك واكسب 30 نقطة على كل استكشاف جديد.
                            </p>
                            <div className="bg-white border text-center border-earth/60 rounded-lg p-3 font-mono font-bold text-lg text-forest mb-2 select-all shadow-sm">
                                {student.referralCode}
                            </div>
                            <p className="text-xs text-center text-gold-dark font-medium mb-6">اضغط لنسخ الكود</p>

                            <h3 className="font-bold text-lg mb-1 text-forest flex items-center gap-2">
                                👨‍👩‍👧‍👦 كود متابعة ولي الأمر
                            </h3>
                            <p className="text-sm text-muted mb-4">
                                أعطِ هذا الكود لولي أمرك ليتمكن من متابعة أدائك ودرجاتك.
                            </p>
                            <div className="bg-forest/10 border text-center border-forest/20 rounded-lg p-3 font-mono font-bold text-lg text-forest mb-2 select-all shadow-sm uppercase tracking-widest">
                                {student.parentLinkingCode}
                            </div>
                            <p className="text-xs text-center text-forest font-medium">كود سري وخاص بك</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, sub, icon, color }: any) {
    return (
        <div className="card flex items-center gap-4 bg-white border border-earth/40 hover:-translate-y-1 transition-transform">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
                {icon}
            </div>
            <div>
                <div className="text-[#7A8C85] text-sm font-medium">{title}</div>
                <div className="text-2xl font-black text-darktext">{value}</div>
                {(sub !== undefined) && <div className="text-xs text-[#7A8C85]/70 mt-1">{sub}</div>}
            </div>
        </div>
    );
}
