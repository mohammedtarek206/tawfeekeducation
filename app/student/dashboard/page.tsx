'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DashboardData = any;

const TASK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    new: { label: 'جديدة', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-amber-100 text-amber-700' },
    completed: { label: 'مكتملة', color: 'bg-green-100 text-green-700' },
    overdue: { label: 'متأخرة', color: 'bg-red-100 text-red-700' },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
    watch_lesson: 'مشاهدة حصة',
    solve_exam: 'حل اختبار',
    login_streak: 'تسجيل دخول متتالي',
    custom: 'مهمة خاصة',
};

export default function StudentDashboardOverview() {
    const [data, setData] = useState<DashboardData>(null);
    const [loading, setLoading] = useState(true);
    const [completingTask, setCompletingTask] = useState<string | null>(null);
    const [taskMsg, setTaskMsg] = useState('');

    const loadData = () => {
        setLoading(true);
        fetch('/api/student/dashboard')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const handleCompleteTask = async (taskId: string) => {
        if (completingTask) return;
        setCompletingTask(taskId);
        setTaskMsg('');
        try {
            const res = await fetch(`/api/student/tasks/${taskId}/complete`, { method: 'POST' });
            const data = await res.json();
            setTaskMsg(data.message || (data.success ? 'تم!' : 'خطأ'));
            if (data.success) loadData();
        } catch {
            setTaskMsg('خطأ في الاتصال');
        } finally {
            setCompletingTask(null);
            setTimeout(() => setTaskMsg(''), 4000);
        }
    };

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

    const { student, stats, lastLesson, upcomingExams, unreadNotifications, taskSummary, achievementSummary } = data;

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
                        {taskSummary?.new > 0 && (
                            <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-bold">
                                <span>🎯</span>
                                <span>{taskSummary.new} مهام جديدة بانتظارك</span>
                            </div>
                        )}
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

            {/* Progress Bar */}
            <div className="card">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">التقدم في المنهج</h3>
                    <span className="font-bold text-forest">{completionPercentage}%</span>
                </div>
                <div className="progress-bar mb-2">
                    <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
                </div>
                <p className="text-xs text-gray-500">{stats.completedLessons} من {stats.totalLessons} حصة مكتملة</p>
            </div>

            {/* ===== TASKS SECTION ===== */}
            {taskMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 font-bold text-sm text-center">
                    {taskMsg}
                </div>
            )}
            <div className="card">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        <h2 className="font-black text-xl text-gray-900">مهامي</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {taskSummary?.new > 0 && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                                {taskSummary.new} جديدة
                            </span>
                        )}
                        {taskSummary?.overdue > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                {taskSummary.overdue} متأخرة
                            </span>
                        )}
                        <Link href="/student/tasks" className="text-forest text-sm font-semibold hover:underline">
                            عرض كل المهام ←
                        </Link>
                    </div>
                </div>

                {!taskSummary || taskSummary.total === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <div className="text-4xl mb-2">🎯</div>
                        <p className="text-gray-500 text-sm">لا توجد مهام مضافة لك حالياً</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Summary Row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center bg-blue-50 rounded-xl p-3">
                                <div className="text-2xl font-black text-blue-700">{taskSummary.new}</div>
                                <div className="text-xs text-blue-600 font-bold">جديدة</div>
                            </div>
                            <div className="text-center bg-green-50 rounded-xl p-3">
                                <div className="text-2xl font-black text-green-700">{taskSummary.completed}</div>
                                <div className="text-xs text-green-600 font-bold">مكتملة</div>
                            </div>
                            <div className="text-center bg-red-50 rounded-xl p-3">
                                <div className="text-2xl font-black text-red-700">{taskSummary.overdue}</div>
                                <div className="text-xs text-red-600 font-bold">متأخرة</div>
                            </div>
                        </div>

                        {/* Latest Tasks */}
                        {(taskSummary.latest || []).map((task: any) => {
                            const s = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS['new'];
                            const isOverdue = task.status === 'overdue';
                            return (
                                <div key={task._id} className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${isOverdue ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white hover:border-forest/30 transition-colors'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                                            {task.isMandatory && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">إجباري</span>}
                                            <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full font-bold">{task.points} نقطة</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm truncate">{task.title}</h4>
                                        {task.endDate && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                الموعد النهائي: {new Date(task.endDate).toLocaleDateString('ar-EG')}
                                            </p>
                                        )}
                                    </div>
                                    {!task.isCompleted && !isOverdue && (
                                        <button
                                            onClick={() => handleCompleteTask(task._id)}
                                            disabled={completingTask === task._id}
                                            className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-forest text-white hover:bg-forest-light transition-colors disabled:opacity-60"
                                        >
                                            {completingTask === task._id ? '...' : 'إتمام'}
                                        </button>
                                    )}
                                    {task.isCompleted && (
                                        <span className="shrink-0 text-xs font-bold text-green-600 flex items-center gap-1">✓ تم</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===== ACHIEVEMENTS SECTION ===== */}
            <div className="card">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <h2 className="font-black text-xl text-gray-900">الأوسمة والإنجازات</h2>
                    </div>
                    <Link href="/student/achievements" className="text-forest text-sm font-semibold hover:underline">
                        عرض كل الإنجازات ←
                    </Link>
                </div>

                {!achievementSummary || achievementSummary.earned === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <div className="text-4xl mb-3">🌱</div>
                        <p className="font-bold text-gray-700 mb-1">ابدأ رحلتك التعليمية واحصل على أول وسام</p>
                        <p className="text-xs text-gray-500">أكمل دروسك وحل اختباراتك للحصول على الأوسمة</p>
                        <Link href="/student/achievements" className="inline-block mt-3 text-xs text-forest font-bold hover:underline">
                            اكتشف الإنجازات المتاحة ←
                        </Link>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-500 mb-4">
                            حصلت على <span className="font-black text-forest">{achievementSummary.earned}</span> من أصل{' '}
                            <span className="font-bold">{achievementSummary.totalAvailable}</span> وسام
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(achievementSummary.latest || []).map((ach: any) => (
                                <div key={ach._id} className="flex flex-col items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="text-3xl" suppressHydrationWarning style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
                                        {ach.icon || '🏆'}
                                    </div>
                                    <p className="text-xs font-bold text-center text-gray-800 line-clamp-2">{ach.title}</p>
                                    <p className="text-xs text-amber-700 font-bold">+{ach.pointsReward} نقطة</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Last Lesson */}
                <div className="lg:col-span-2 space-y-6">
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

                {/* Side Panel */}
                <div className="space-y-6">
                    {/* Explore More */}
                    <div className="card bg-gray-50/50">
                        <h3 className="font-bold text-lg mb-4 text-forest">استكشف المزيد</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { href: '/student/lesson-quizzes', img: '/اختبار الحصه.jpg', title: 'اختبارات الحصص' },
                                { href: '/student/solution-videos', img: '/فيديوهات الحل.jpg', title: 'فيديوهات الحل' },
                                { href: '/student/weekly-exams', img: '/اختبار اسبوعي.jpg', title: 'الاختبار الأسبوعي' },
                                { href: '/student/monthly-exams', img: '/اختبار الشهري.jpg', title: 'الاختبار الشهري' },
                                { href: '/student/study-notes', img: '/مذكره سوال وجواب-.jpg', title: 'مذكرات مراجعة' },
                                { href: '/student/ask-master', img: '/اسال المستر.jpg', title: 'اسأل المستر' },
                            ].map(item => (
                                <Link key={item.href} href={item.href} className="group bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-forest/50 transition-all shadow-sm hover:shadow-md flex flex-col">
                                    <div className="w-full h-16 overflow-hidden relative">
                                        <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    </div>
                                    <div className="p-2">
                                        <h4 className="font-bold text-gray-800 text-xs">{item.title}</h4>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Exams */}
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
                                        <p className="text-xs text-muted mb-2">المدة: {exam.duration} دقيقة</p>
                                        <Link href={`/student/exams/${exam._id}`} className="block w-full text-center bg-white border border-earth/50 text-forest text-xs font-bold py-2 rounded-lg hover:bg-forest hover:text-white transition-colors">
                                            دخول الامتحان
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">لا توجد امتحانات قادمة</div>
                        )}
                    </div>

                    {/* Referral Code */}
                    <div className="card bg-gradient-to-br from-offwhite to-white border-gold/30 relative overflow-hidden">
                        <div className="absolute inset-0 contour-bg opacity-30 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="text-3xl mb-2">🧭</div>
                            <h3 className="font-bold text-lg mb-1 text-forest">اكسب نقاط جغرافيا!</h3>
                            <p className="text-sm text-muted mb-4">شارك كود الدعوة بتاعك مع صحابك واكسب 30 نقطة.</p>
                            <div className="bg-white border text-center border-earth/60 rounded-lg p-3 font-mono font-bold text-lg text-forest mb-2 select-all shadow-sm">
                                {student.referralCode}
                            </div>
                            <h3 className="font-bold text-lg mb-1 text-forest flex items-center gap-2 mt-4">
                                👨‍👩‍👧‍👦 كود متابعة ولي الأمر
                            </h3>
                            <div className="bg-forest/10 border text-center border-forest/20 rounded-lg p-3 font-mono font-bold text-lg text-forest mt-2 select-all shadow-sm uppercase tracking-widest">
                                {student.parentLinkingCode}
                            </div>
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
