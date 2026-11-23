'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { gradeLabel } from '@/lib/constants/grades';
import { formatDate } from '@/lib/utils/helpers';

export default function StudentTrackingPage() {
    const params = useParams();
    const studentId = params?.id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'exams' | 'courses' | 'points' | 'subscriptions' | 'timeline'>('overview');

    // Quick points adjustment modal inside profile
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [pointsAmount, setPointsAmount] = useState('50');
    const [pointsReason, setPointsReason] = useState('');
    const [pointsLoading, setPointsLoading] = useState(false);
    const [pointsMsg, setPointsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadTrackingData = async () => {
        if (!studentId) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/students/${studentId}/tracking`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                setError(json.message || 'فشل في تحميل بيانات الطالب');
            }
        } catch {
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrackingData();
    }, [studentId]);

    const handleAdjustPoints = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseInt(pointsAmount, 10);
        if (isNaN(amt) || amt === 0) {
            setPointsMsg({ type: 'error', text: 'يرجى كتابة عدد نقاط صحيح غير صفر' });
            return;
        }
        if (!pointsReason || pointsReason.trim().length < 3) {
            setPointsMsg({ type: 'error', text: 'يرجى كتابة سبب التعديل (3 أحرف على الأقل)' });
            return;
        }

        setPointsLoading(true);
        setPointsMsg(null);
        try {
            const res = await fetch(`/api/admin/students/${studentId}/points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt, reason: pointsReason.trim() }),
            });
            const json = await res.json();
            if (json.success) {
                setPointsMsg({ type: 'success', text: json.message });
                setTimeout(() => {
                    setShowPointsModal(false);
                    setPointsReason('');
                    loadTrackingData();
                }, 1000);
            } else {
                setPointsMsg({ type: 'error', text: json.message || 'فشل تعديل النقاط' });
            }
        } catch {
            setPointsMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم' });
        } finally {
            setPointsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-28 bg-gray-200 rounded-3xl" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
                    ))}
                </div>
                <div className="h-96 bg-gray-200 rounded-3xl" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-white p-12 rounded-3xl border text-center space-y-4 max-w-xl mx-auto my-12">
                <div className="text-5xl">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800">{error || 'لم يتم العثور على الطالب'}</h2>
                <Link href="/admin/students" className="btn-primary text-sm inline-block px-6">
                    العودة لقائمة الطلاب
                </Link>
            </div>
        );
    }

    const { student, summary, videos, exams, courses, points, subscriptions, timeline } = data;

    return (
        <div className="space-y-6 pb-16 animate-fadeIn">
            {/* Top Navigation & Student Header Card */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Link
                        href="/admin/students"
                        className="text-xs text-gray-500 hover:text-forest font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <span>←</span>
                        <span>العودة لقائمة الطلاب</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPointsModal(true)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <span>⭐</span>
                            <span>تعديل النقاط</span>
                        </button>
                        <Link
                            href="/admin/free-students"
                            className="px-3.5 py-1.5 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <span>🎁</span>
                            <span>إدارة الاشتراك</span>
                        </Link>
                    </div>
                </div>

                {/* Profile Banner Card */}
                <div className="bg-gradient-to-l from-forest to-forest-light text-white rounded-3xl p-6 sm:p-8 shadow-forest relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="absolute inset-0 geo-grid-bg opacity-10 pointer-events-none" />
                    <div className="relative z-10 space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="bg-gold/20 text-gold-light border border-gold/30 text-xs font-bold px-3 py-0.5 rounded-full">
                                {gradeLabel(student.grade) || 'طالب'}
                            </span>
                            {student.isFreeStudent && (
                                <span className="bg-white/20 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                    🎁 طالب مجاني (مقعد #{student.freeSlotNumber || '-'})
                                </span>
                            )}
                            <span
                                className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                                    student.liveSubStatus === 'active'
                                        ? 'bg-emerald-500 text-white'
                                        : student.liveSubStatus === 'expired'
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-gray-400 text-white'
                                }`}
                            >
                                {student.liveSubStatus === 'active'
                                    ? 'اشتراك نشط'
                                    : student.liveSubStatus === 'expired'
                                    ? 'اشتراك منتهي'
                                    : 'بدون اشتراك'}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black">{student.name}</h1>
                        <p className="text-white/80 text-xs sm:text-sm font-medium flex flex-wrap gap-4 pt-1">
                            <span>📞 {student.phone}</span>
                            {student.governorate && <span>📍 {student.governorate}</span>}
                            <span>📅 التسجيل: {formatDate(student.createdAt)}</span>
                            {student.lastLogin && <span>⏱️ آخر دخول: {formatDate(student.lastLogin)}</span>}
                        </p>
                    </div>

                    <div className="relative z-10 flex gap-3 shrink-0">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[110px]">
                            <span className="text-[11px] font-bold text-white/80 block mb-0.5">رصيد النقاط</span>
                            <span className="text-2xl font-black text-gold">{student.points}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[110px]">
                            <span className="text-[11px] font-bold text-white/80 block mb-0.5">المستوى الحالي</span>
                            <span className="text-2xl font-black text-white">{student.level}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl mb-1">🎬</div>
                    <div className="text-2xl font-black text-gray-900">
                        {summary.completedVideosCount} <span className="text-xs text-gray-400 font-normal">/ {summary.totalLessonsCount}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-bold mt-1">
                        الفيديوهات المكتملة ({summary.videoCompletionRate}%)
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl mb-1">📝</div>
                    <div className="text-2xl font-black text-gray-900">
                        {summary.completedExamsCount} <span className="text-xs text-gray-400 font-normal">/ {summary.totalExamsCount}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-bold mt-1">الاختبارات المكتملة</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl mb-1">📊</div>
                    <div className="text-2xl font-black text-emerald-600">{summary.averageScorePercentage}%</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">متوسط درجات الاختبارات</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl mb-1">📚</div>
                    <div className="text-2xl font-black text-forest">{summary.enrolledCoursesCount}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">الوحدات والمناهج المتاحة</div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-1.5">
                {[
                    { id: 'overview', label: '📊 نظرة عامة' },
                    { id: 'videos', label: `🎬 الفيديوهات (${videos.length})` },
                    { id: 'exams', label: `📝 الاختبارات (${exams.length})` },
                    { id: 'courses', label: `📚 الكورسات (${courses.length})` },
                    { id: 'points', label: '⭐ النقاط والإنجازات' },
                    { id: 'subscriptions', label: `🎁 الاشتراكات (${subscriptions.history.length})` },
                    { id: 'timeline', label: `⏱️ سجل النشاط (${timeline.length})` },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === t.id
                                ? 'bg-forest text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB 1: OVERVIEW ─── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basic Data Card */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-900 text-sm border-b pb-3 flex items-center gap-2">
                            <span>👤</span>
                            <span>البيانات الأساسية والحساب</span>
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">حالة الحساب:</span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                                    {student.status === 'approved' ? 'مقبول ومفعّل' : student.status}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">الصف الدراسي:</span>
                                <span className="font-bold text-gray-900">{gradeLabel(student.grade)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">ولي الأمر:</span>
                                <span className="font-bold text-gray-900">{student.parentName || 'غير مسجل'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">هاتف ولي الأمر:</span>
                                <span className="font-mono text-gray-700">{student.parentPhone || '—'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">كود ربط ولي الأمر:</span>
                                <span className="font-mono font-bold text-forest bg-forest/10 px-2 py-0.5 rounded">
                                    {student.parentLinkingCode || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">حالة الاشتراك:</span>
                                <span
                                    className={`font-bold px-2 py-0.5 rounded ${
                                        student.liveSubStatus === 'active'
                                            ? 'text-emerald-700 bg-emerald-50'
                                            : 'text-rose-700 bg-rose-50'
                                    }`}
                                >
                                    {student.liveSubStatus === 'active' ? 'نشط ومفعّل' : 'منتهي أو غير مفعّل'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">تاريخ بداية الاشتراك:</span>
                                <span className="font-mono text-gray-700">
                                    {student.subscriptionStartDate ? formatDate(student.subscriptionStartDate) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-semibold">تاريخ نهاية الاشتراك:</span>
                                <span className="font-mono text-gray-700">
                                    {student.subscriptionEndDate ? formatDate(student.subscriptionEndDate) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-gray-500 font-semibold">آخر نشاط للطالب:</span>
                                <span className="font-mono text-gray-700">
                                    {student.lastActivityDate ? formatDate(student.lastActivityDate) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Summary Card */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-bold text-gray-900 text-sm border-b pb-3 flex items-center gap-2">
                            <span>📈</span>
                            <span>ملخص التقدم الأكاديمي والتحصيل</span>
                        </h3>

                        {/* Video Completion Meter */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                                <span>نسبة إتمام الفيديوهات المتاحة</span>
                                <span className="text-forest">
                                    {summary.completedVideosCount} من {summary.totalLessonsCount} فيديو ({summary.videoCompletionRate}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-tawfeek-green h-full rounded-full transition-all duration-500"
                                    style={{ width: `${summary.videoCompletionRate}%` }}
                                />
                            </div>
                        </div>

                        {/* Exam Average Meter */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                                <span>متوسط درجات الاختبارات</span>
                                <span className="text-emerald-700 font-bold">{summary.averageScorePercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${summary.averageScorePercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Mini Courses Overview */}
                        <div className="space-y-3 pt-2">
                            <div className="text-xs font-bold text-gray-700">التقدم في الوحدات والمناهج الدراسية:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {courses.slice(0, 4).map((c: any) => (
                                    <div key={c.unit} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-gray-900 truncate">{c.unit}</span>
                                            <span className="text-forest">{c.progressPercentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-forest h-full rounded-full"
                                                style={{ width: `${c.progressPercentage}%` }}
                                            />
                                        </div>
                                        <div className="text-[11px] text-gray-500 flex justify-between">
                                            <span>مكتمل: {c.completedLessons}</span>
                                            <span>متبقي: {c.remainingLessons}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 2: VIDEOS TRACKING ─── */}
            {activeTab === 'videos' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <span>🎬</span>
                                <span>سجل متابعة مشاهدة الفيديوهات التفصيلي</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                تتبع دقيق لكل فيديو متاح لصف الطالب: النسبة الفعلية، وقت المشاهدة، وتأكيد الإتمام
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                            <span>مكتمل: {summary.completedVideosCount}</span>
                            <span>يشاهد: {summary.inProgressVideosCount}</span>
                            <span>لم يبدأ: {summary.notStartedVideosCount}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-3.5"># الحصة</th>
                                    <th className="p-3.5">اسم الفيديو</th>
                                    <th className="p-3.5">الوحدة</th>
                                    <th className="p-3.5">حالة المشاهدة</th>
                                    <th className="p-3.5">نسبة المشاهدة</th>
                                    <th className="p-3.5">وقت المشاهدة الفعلي</th>
                                    <th className="p-3.5">آخر موضع</th>
                                    <th className="p-3.5">تاريخ آخر مشاهدة</th>
                                    <th className="p-3.5 text-center">الإتمام</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {videos.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-10 text-gray-400">
                                            لا توجد فيديوهات منشورة لهذا الصف الدراسي
                                        </td>
                                    </tr>
                                ) : (
                                    videos.map((v: any) => (
                                        <tr key={v.lessonId} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3.5 font-bold font-mono text-gray-500">#{v.lessonNumber}</td>
                                            <td className="p-3.5 font-bold text-gray-900 max-w-xs">{v.title}</td>
                                            <td className="p-3.5 text-gray-600">{v.unit}</td>
                                            <td className="p-3.5">
                                                {v.watchStatus === 'completed' && (
                                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                                                        ✔ مكتمل
                                                    </span>
                                                )}
                                                {v.watchStatus === 'watching' && (
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                                                        ▶️ يشاهد
                                                    </span>
                                                )}
                                                {v.watchStatus === 'not_started' && (
                                                    <span className="bg-gray-100 text-gray-500 font-bold px-2.5 py-0.5 rounded-full">
                                                        ⚪ لم يبدأ
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 font-mono">{v.watchedPercentage}%</span>
                                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                v.watchedPercentage >= 50 ? 'bg-tawfeek-green' : 'bg-amber-500'
                                                            }`}
                                                            style={{ width: `${v.watchedPercentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3.5 font-mono text-gray-600">
                                                {v.uniqueSecondsWatched > 0 ? `${Math.round(v.uniqueSecondsWatched / 60)} دقيقة` : '—'}
                                            </td>
                                            <td className="p-3.5 font-mono text-gray-600">
                                                {v.lastWatchedPosition > 0 ? `${Math.round(v.lastWatchedPosition / 60)}:00` : '—'}
                                            </td>
                                            <td className="p-3.5 font-mono text-gray-600">
                                                {v.lastWatchedAt ? formatDate(v.lastWatchedAt) : '—'}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                {v.isCompleted ? (
                                                    <span className="text-emerald-600 font-black text-sm">نعم (✔)</span>
                                                ) : (
                                                    <span className="text-gray-400 font-bold">لا</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB 3: EXAMS TRACKING ─── */}
            {activeTab === 'exams' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <span>📝</span>
                                <span>سجل متابعة الاختبارات والامتحانات والدرجات</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                متابعة المحاولات ونتائج الاختبارات والامتحانات الأسبوعية والشهرية
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                            <span>المتاحة: {summary.totalExamsCount}</span>
                            <span>أكملها: {summary.completedExamsCount}</span>
                            <span>لم يدخلها: {summary.notTakenExamsCount}</span>
                            <span className="text-emerald-700">أعلى درجة: {summary.highestScorePercentage}%</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-3.5">اسم الاختبار</th>
                                    <th className="p-3.5">النوع</th>
                                    <th className="p-3.5">الحالة</th>
                                    <th className="p-3.5">الدرجة الفعلية</th>
                                    <th className="p-3.5">النسبة المئوية</th>
                                    <th className="p-3.5">أفضل نسبة</th>
                                    <th className="p-3.5">عدد المحاولات</th>
                                    <th className="p-3.5">تاريخ آخر محاولة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exams.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-gray-400">
                                            لا توجد اختبارات متاحة لهذا الصف
                                        </td>
                                    </tr>
                                ) : (
                                    exams.map((e: any) => (
                                        <tr key={e.examId} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3.5 font-bold text-gray-900 max-w-xs">{e.title}</td>
                                            <td className="p-3.5">
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold">
                                                    {e.type === 'monthly' ? 'شهري' : e.type === 'weekly' ? 'أسبوعي' : 'كويز'}
                                                </span>
                                            </td>
                                            <td className="p-3.5">
                                                {e.status === 'graded' && (
                                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                                                        ✔ تم التصحيح
                                                    </span>
                                                )}
                                                {e.status === 'needs_manual_grading' && (
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                                                        ⏳ يحتاج تصحيح يدوي
                                                    </span>
                                                )}
                                                {e.status === 'submitted' && (
                                                    <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                                                        📩 تم التسليم
                                                    </span>
                                                )}
                                                {e.status === 'started' && (
                                                    <span className="bg-yellow-100 text-yellow-800 font-bold px-2.5 py-0.5 rounded-full">
                                                        ▶️ بدأ الاختبار
                                                    </span>
                                                )}
                                                {e.status === 'not_started' && (
                                                    <span className="bg-gray-100 text-gray-400 font-bold px-2.5 py-0.5 rounded-full">
                                                        ⚪ لم يبدأ
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3.5 font-mono font-bold text-gray-900">
                                                {e.score !== null ? `${e.score} / ${e.totalPoints}` : '—'}
                                            </td>
                                            <td className="p-3.5 font-mono font-bold">
                                                {e.percentage !== null ? (
                                                    <span className={e.percentage >= e.passingScore ? 'text-emerald-700' : 'text-rose-600'}>
                                                        {e.percentage}%
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="p-3.5 font-mono text-gray-700">
                                                {e.bestPercentage !== null ? `${e.bestPercentage}%` : '—'}
                                            </td>
                                            <td className="p-3.5 font-mono text-gray-600">
                                                {e.attemptsCount} / {e.maxAttempts || '∞'}
                                            </td>
                                            <td className="p-3.5 font-mono text-gray-600">
                                                {e.lastAttemptDate ? formatDate(e.lastAttemptDate) : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB 4: COURSES TRACKING ─── */}
            {activeTab === 'courses' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>📚</span>
                            <span>متابعة الكورسات والمناهج والوحدات الدراسية</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            نسبة تقدم الطالب في كل وحدة دراسية مع عدد الفيديوهات المكتملة والمتبقية
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courses.length === 0 ? (
                            <div className="col-span-full py-10 text-center text-gray-400">
                                لا توجد وحدات دراسية مسجلة
                            </div>
                        ) : (
                            courses.map((c: any) => (
                                <div key={c.unit} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-gray-900 text-sm">{c.unit}</h4>
                                        <span
                                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                c.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}
                                        >
                                            {c.isCompleted ? 'مكتملة بالكامل' : `${c.progressPercentage}%`}
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-tawfeek-green h-full rounded-full transition-all"
                                            style={{ width: `${c.progressPercentage}%` }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-1">
                                        <div>
                                            إجمالي الحصص: <span className="font-bold text-gray-800">{c.totalLessons}</span>
                                        </div>
                                        <div>
                                            المكتملة: <span className="font-bold text-emerald-700">{c.completedLessons}</span>
                                        </div>
                                        <div>
                                            المتبقية: <span className="font-bold text-rose-600">{c.remainingLessons}</span>
                                        </div>
                                        <div>
                                            آخر نشاط:{' '}
                                            <span className="font-mono text-gray-700">
                                                {c.lastActivityDate ? formatDate(c.lastActivityDate) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 5: POINTS & ACHIEVEMENTS ─── */}
            {activeTab === 'points' && (
                <div className="space-y-6">
                    {/* Points Breakdown 4-Card Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <div className="text-2xl mb-1">🎬</div>
                            <div className="text-2xl font-black text-gray-900">{points.breakdown.videoPoints}</div>
                            <div className="text-xs text-gray-500 font-bold mt-1">نقاط الفيديوهات</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <div className="text-2xl mb-1">📝</div>
                            <div className="text-2xl font-black text-gray-900">{points.breakdown.examPoints}</div>
                            <div className="text-xs text-gray-500 font-bold mt-1">نقاط الاختبارات</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <div className="text-2xl mb-1">🏆</div>
                            <div className="text-2xl font-black text-gray-900">{points.breakdown.achievementPoints}</div>
                            <div className="text-xs text-gray-500 font-bold mt-1">نقاط الإنجازات والمهام</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <div className="text-2xl mb-1">👥</div>
                            <div className="text-2xl font-black text-gray-900">{points.breakdown.referralPoints}</div>
                            <div className="text-xs text-gray-500 font-bold mt-1">نقاط الإحالات</div>
                        </div>
                    </div>

                    {/* Secondary stats row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">إجمالي النقاط الفعلي:</span>
                            <span className="text-xl font-black text-forest">{student.points} نقطة</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">النقاط المضافة يدويًا من الأدمن:</span>
                            <span className="text-xl font-black text-emerald-600">+{points.breakdown.adminAddedPoints}</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">إجمالي النقاط المخصومة:</span>
                            <span className="text-xl font-black text-rose-600">−{points.breakdown.deductedPoints}</span>
                        </div>
                    </div>

                    {/* Transactions History */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-3">
                            <span>📜</span>
                            <span>سجل معاملات النقاط التاريخية من قاعدة البيانات</span>
                        </h4>

                        <div className="overflow-x-auto max-h-80">
                            <table className="w-full text-right text-xs">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                    <tr>
                                        <th className="p-3">نوع المعاملة</th>
                                        <th className="p-3">السبب المسجل</th>
                                        <th className="p-3">القيمة</th>
                                        <th className="p-3">الرصيد بعد المعاملة</th>
                                        <th className="p-3">التاريخ والوقت</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {points.transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-gray-400">
                                                لا توجد معاملات نقاط مسجلة
                                            </td>
                                        </tr>
                                    ) : (
                                        points.transactions.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-3 font-bold text-gray-700">{tx.type}</td>
                                                <td className="p-3 text-gray-900 max-w-xs">{tx.reason}</td>
                                                <td className="p-3 font-mono font-bold">
                                                    <span className={tx.amount > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                                                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono font-bold text-gray-900">{tx.balanceAfter}</td>
                                                <td className="p-3 font-mono text-gray-500">{formatDate(tx.createdAt)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Achievements List */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-3">
                            <span>🏆</span>
                            <span>الأوسمة والإنجازات المحققة ({points.achievements.length})</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {points.achievements.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-gray-400 text-xs">
                                    لم يحقق الطالب أي أوسمة بعد
                                </div>
                            ) : (
                                points.achievements.map((ach: any) => (
                                    <div key={ach.id} className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 flex items-center gap-3">
                                        <div className="text-3xl shrink-0">{ach.icon || '🏆'}</div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-xs">{ach.title}</div>
                                            <div className="text-[11px] text-gray-500 mt-0.5">{ach.description}</div>
                                            <div className="text-[10px] text-emerald-700 font-bold mt-1">
                                                +{ach.pointsEarned} نقطة • {formatDate(ach.earnedAt)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 6: SUBSCRIPTIONS ─── */}
            {activeTab === 'subscriptions' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <div className="border-b pb-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <span>🎁</span>
                                <span>سجل الاشتراكات وتواريخ الصلاحية</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                عرض جميع الاشتراكات المجانية والمدفوعة الخاصة بالطالب
                            </p>
                        </div>
                        <Link
                            href="/admin/free-students"
                            className="btn-primary text-xs px-4 py-2"
                        >
                            ⚙️ تمديد / تعديل في لوحة الاشتراكات المجانية
                        </Link>
                    </div>

                    {/* Current Subscription Card */}
                    <div className="p-5 bg-gradient-to-r from-gray-50 to-emerald-50/30 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">نوع الاشتراك الحالي:</span>
                            <span className="font-black text-forest text-base">
                                {student.isFreeStudent ? 'عرض مجاني كامل' : 'اشتراك عادي / مدفوع'}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">فترة الصلاحية (UTC):</span>
                            <span className="font-mono text-xs font-bold text-gray-800">
                                {student.subscriptionStartDate ? formatDate(student.subscriptionStartDate) : '—'}
                                {' إلى '}
                                {student.subscriptionEndDate ? formatDate(student.subscriptionEndDate) : '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">الحالة المباشرة:</span>
                            <span
                                className={`font-bold px-3 py-1 rounded-full text-xs inline-block ${
                                    student.liveSubStatus === 'active'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                                {student.liveSubStatus === 'active' ? '🟢 مفعّل ويحق له الوصول' : '🔴 منتهي ولا يمكنه الوصول للمحتوى المدفوع'}
                            </span>
                        </div>
                    </div>

                    {/* Subscriptions Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-3">الباقة / المصدر</th>
                                    <th className="p-3">المصدر</th>
                                    <th className="p-3">الحالة</th>
                                    <th className="p-3">تاريخ البداية</th>
                                    <th className="p-3">تاريخ الانتهاء</th>
                                    <th className="p-3">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {subscriptions.history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-400">
                                            لا توجد اشتراكات سابقة مسجلة في جدول الاشتراكات
                                        </td>
                                    </tr>
                                ) : (
                                    subscriptions.history.map((sub: any) => (
                                        <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3 font-bold text-gray-900">{sub.planName}</td>
                                            <td className="p-3 text-gray-600">
                                                {sub.source === 'free_offer' ? 'عرض مجاني' : sub.source === 'payment' ? 'دفع إلكتروني' : 'إداري'}
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full font-bold ${
                                                        sub.status === 'active'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : sub.status === 'expired'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    {sub.status === 'active' ? 'نشط' : sub.status === 'expired' ? 'منتهي' : sub.status}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-gray-600">{formatDate(sub.startDate)}</td>
                                            <td className="p-3 font-mono text-gray-600">{formatDate(sub.endDate)}</td>
                                            <td className="p-3 text-gray-500 max-w-xs">{sub.notes || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── TAB 7: ACTIVITY TIMELINE ─── */}
            {activeTab === 'timeline' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <div className="border-b pb-4">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>⏱️</span>
                            <span>سجل النشاط العام والزمني (Student Activity Timeline)</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            سجل زمني مرتب لأحدث أنشطة الطالب وتفاعلاته داخل المنصة
                        </p>
                    </div>

                    <div className="relative border-r-2 border-gray-100 mr-4 space-y-6 pr-6">
                        {timeline.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-xs">
                                لا يوجد نشاط مسجل للطالب بعد
                            </div>
                        ) : (
                            timeline.map((evt: any) => (
                                <div key={evt.id} className="relative group">
                                    {/* Timeline dot */}
                                    <div className="absolute -right-[33px] top-1 w-6 h-6 rounded-full bg-white border-2 border-forest flex items-center justify-center text-xs shadow-xs">
                                        <span>{evt.icon}</span>
                                    </div>

                                    <div className="bg-gray-50 hover:bg-gray-100/70 p-4 rounded-2xl border border-gray-100 transition-colors space-y-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${evt.badgeColor}`}>
                                                    {evt.title}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-400 font-mono" suppressHydrationWarning>
                                                {formatDate(evt.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed pt-1">
                                            {evt.description}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Points Modal */}
            {showPointsModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                <span>⭐</span>
                                <span>تعديل رصيد النقاط للطالب ({student.name})</span>
                            </h3>
                            <button
                                onClick={() => setShowPointsModal(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {pointsMsg && (
                            <div
                                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                    pointsMsg.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                            >
                                <span>{pointsMsg.type === 'success' ? '✅' : '❌'}</span>
                                <span>{pointsMsg.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleAdjustPoints} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    عدد النقاط (موجب للإضافة أو سالب للخصم) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={pointsAmount}
                                    onChange={(e) => setPointsAmount(e.target.value)}
                                    placeholder="مثال: 50 أو -20"
                                    className="input-field w-full text-sm font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    سبب التعديل (مطلوب للتوثيق في السجل) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={pointsReason}
                                    onChange={(e) => setPointsReason(e.target.value)}
                                    placeholder="مثال: مكافأة التميز في الواجب..."
                                    className="input-field w-full text-xs resize-none"
                                    required
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPointsModal(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={pointsLoading}
                                    className="flex-1 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    {pointsLoading ? 'جاري الحفظ...' : 'حفظ التعديل'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
