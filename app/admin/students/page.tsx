'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';

function StudentsListContent() {
    const searchParams = useSearchParams();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [grade, setGrade] = useState(searchParams.get('grade') || '');
    const [noVideo, setNoVideo] = useState(searchParams.get('no_video') === 'true');
    const [noExam, setNoExam] = useState(searchParams.get('no_exam') === 'true');
    const [inactive, setInactive] = useState(searchParams.get('inactive') === 'true');
    const [expiringSoon, setExpiringSoon] = useState(searchParams.get('expiring_soon') === 'true');
    const [subscriptionStatus, setSubscriptionStatus] = useState(searchParams.get('subscription_status') || '');
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_desc');

    const loadData = () => {
        setLoading(true);
        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (status) query.append('status', status);
        if (grade) query.append('grade', grade);
        if (noVideo) query.append('no_video', 'true');
        if (noExam) query.append('no_exam', 'true');
        if (inactive) query.append('inactive', 'true');
        if (expiringSoon) query.append('expiring_soon', 'true');
        if (subscriptionStatus) query.append('subscription_status', subscriptionStatus);
        if (sortBy) query.append('sort', sortBy);

        fetch(`/api/admin/students?${query.toString()}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.success) setData(res.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [status, grade, noVideo, noExam, inactive, expiringSoon, subscriptionStatus, sortBy]);

    const clearSpecialFilters = () => {
        setNoVideo(false);
        setNoExam(false);
        setInactive(false);
        setExpiringSoon(false);
        setSubscriptionStatus('');
        setStatus('');
        setGrade('');
        setSearch('');
    };

    const hasSpecialFilters = noVideo || noExam || inactive || expiringSoon || subscriptionStatus || status || grade;

    const handleAction = async (id: string, action: string) => {
        let rejectionReason = undefined;
        if (action === 'reject') {
            rejectionReason = prompt('اكتب سبب الرفض (سيظهر للطالب):');
            if (rejectionReason === null) return;
        } else {
            if (!confirm(`هل أنت متأكد من إجراء هذا الإجراء؟`)) return;
        }

        try {
            const res = await fetch(`/api/admin/students/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, rejectionReason }),
            });
            const result = await res.json();
            if (result.success) {
                alert('تم بنجاح');
                loadData();
            } else {
                alert(result.message || 'حدث خطأ');
            }
        } catch {
            alert('حدث خطأ');
        }
    };

    const handleAdjustPoints = async (id: string, name: string) => {
        const amountStr = prompt(`تعديل رصيد النقاط للطالب (${name}):\nأدخل عدد النقاط (موجب للإضافة أو سالب للخصم، مثال: 50 أو -20):`);
        if (!amountStr) return;
        const amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount === 0) {
            alert('يرجى كتابة عدد نقاط صحيح غير صفر');
            return;
        }

        const reason = prompt(`اكتب سبب تعديل النقاط للطالب (${name}):`);
        if (!reason || reason.trim().length < 3) {
            alert('السبب مطلوب (3 أحرف على الأقل)');
            return;
        }

        try {
            const res = await fetch(`/api/admin/students/${id}/points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, reason: reason.trim() }),
            });
            const result = await res.json();
            if (result.success) {
                alert(result.message);
                loadData();
            } else {
                alert(result.message || 'حدث خطأ في تعديل النقاط');
            }
        } catch {
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    const handleResetPoints = async (id: string, name: string, currentPoints: number) => {
        if (currentPoints <= 0) {
            alert('رصيد الطالب صفر بالفعل ولا توجد نقاط لتصفيرها');
            return;
        }

        if (!confirm(`⚠️ تأكيد تصفير النقاط:\nهل أنت متأكد من تصفير رصيد الطالب (${name})؟\nالرصيد الحالي: ${currentPoints} نقطة\nسيصبح الرصيد 0 مع الحفاظ التام على السجل والتاريخ.`)) {
            return;
        }

        const reason = prompt(`اكتب سبب تصفير نقاط الطالب (${name}):`, 'تصفير إداري للرصيد');
        if (!reason || reason.trim().length < 3) {
            alert('السبب مطلوب (3 أحرف على الأقل)');
            return;
        }

        try {
            const res = await fetch('/api/admin/points/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: id,
                    operationType: 'reset',
                    amount: currentPoints,
                    reason: reason.trim(),
                    requestId: `reset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                }),
            });
            const result = await res.json();
            if (result.success) {
                alert(result.message || 'تم تصفير نقاط الطالب بنجاح');
                loadData();
            } else {
                alert(result.message || 'حدث خطأ في تصفير النقاط');
            }
        } catch {
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`⚠️ تحذير: هل أنت متأكد تماماً من حذف الطالب (${name}) بشكل نهائي؟\nسيتم حذف جميع سجلاته واختباراته وتطبيقاته من النظام ولا يمكن التراجع عن هذا الإجراء.`)) return;

        try {
            const res = await fetch(`/api/admin/students/${id}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                alert(result.message || 'تم حذف الطالب بنجاح');
                loadData();
            } else {
                alert(result.message || 'حدث خطأ في الحذف');
            }
        } catch {
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة ومتابعة الطلاب</h1>
                    <p className="text-gray-500 text-xs mt-1">عرض وتحليل بيانات الطلاب وتتبع نشاطهم واشتراكاتهم</p>
                </div>
                {hasSpecialFilters && (
                    <button
                        onClick={clearSpecialFilters}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 self-start sm:self-auto"
                    >
                        <span>✕</span> إلغاء جميع الفلاتر
                    </button>
                )}
            </div>

            {/* Special Notification Banner when redirected from Analytics */}
            {noVideo && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-amber-900 text-xs font-bold">
                    <span>🎬 يتم عرض الطلاب الذين لم يشاهدوا أي فيديو حتى الآن ({data?.total || 0} طالب)</span>
                    <button onClick={() => setNoVideo(false)} className="text-amber-700 hover:underline">إلغاء الفلتر</button>
                </div>
            )}
            {noExam && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between text-purple-900 text-xs font-bold">
                    <span>📝 يتم عرض الطلاب الذين لم يخوضوا أي امتحان حتى الآن ({data?.total || 0} طالب)</span>
                    <button onClick={() => setNoExam(false)} className="text-purple-700 hover:underline">إلغاء الفلتر</button>
                </div>
            )}
            {inactive && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-rose-900 text-xs font-bold">
                    <span>⚠️ يتم عرض الطلاب المنقطعين عن المنصة لأكثر من 7 أيام ({data?.total || 0} طالب)</span>
                    <button onClick={() => setInactive(false)} className="text-rose-700 hover:underline">إلغاء الفلتر</button>
                </div>
            )}
            {expiringSoon && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-amber-900 text-xs font-bold">
                    <span>⏳ يتم عرض الطلاب الذين تقترب اشتراكاتهم من الانتهاء خلال 3 أيام ({data?.total || 0} طالب)</span>
                    <button onClick={() => setExpiringSoon(false)} className="text-amber-700 hover:underline">إلغاء الفلتر</button>
                </div>
            )}

            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="ابحث بالاسم أو رقم الهاتف..."
                            className="input-field w-full text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                        />
                    </div>
                    <select
                        className="input-field text-sm max-w-[180px]"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">جميع الحالات</option>
                        <option value="pending">قيد الانتظار</option>
                        <option value="approved">مقبولون</option>
                        <option value="rejected">مرفوضون</option>
                        <option value="suspended">موقوفون</option>
                    </select>
                    <select
                        className="input-field text-sm max-w-[180px]"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                    >
                        <option value="">كل الصفوف</option>
                        {ACTIVE_GRADES.map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>
                    <select
                        className="input-field text-sm max-w-[180px]"
                        value={subscriptionStatus}
                        onChange={(e) => setSubscriptionStatus(e.target.value)}
                    >
                        <option value="">كل الاشتراكات</option>
                        <option value="free">اشتراك مجاني</option>
                        <option value="active">اشتراك نشط</option>
                        <option value="paid">اشتراك مدفوع</option>
                        <option value="expired">اشتراك منتهي</option>
                        <option value="none">بدون اشتراك</option>
                    </select>
                    <select
                        className="input-field text-sm max-w-[160px]"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="created_desc">الأحدث تسجيلًا</option>
                        <option value="points_desc">الأعلى نقاطًا 🪙</option>
                        <option value="last_login">آخر نشاط</option>
                        <option value="name">أبجديًا</option>
                    </select>
                    <button className="btn-primary text-sm px-5 py-2 shrink-0" onClick={loadData}>
                        بحث
                    </button>
                </div>

                {/* Quick Toggle Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 font-bold ml-1">تصفية سريعة:</span>
                    <button
                        onClick={() => setNoVideo(!noVideo)}
                        className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                            noVideo ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        🎬 لم يشاهدوا أي فيديو
                    </button>
                    <button
                        onClick={() => setNoExam(!noExam)}
                        className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                            noExam ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-xs' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        📝 لم يخوضوا أي امتحان
                    </button>
                    <button
                        onClick={() => setInactive(!inactive)}
                        className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                            inactive ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        ⚠️ طلاب منقطعون (&gt; 7 أيام)
                    </button>
                    <button
                        onClick={() => setExpiringSoon(!expiringSoon)}
                        className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                            expiringSoon ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        ⏳ اشتراكات قريبة الانتهاء
                    </button>
                    <button
                        onClick={() => setSortBy(sortBy === 'points_desc' ? 'created_desc' : 'points_desc')}
                        className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                            sortBy === 'points_desc' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        🏆 متصدرو النقاط
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">اسم الطالب</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">رقم الهاتف</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الصف</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الحالة</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الاشتراك</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">النقاط</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-500 animate-pulse">جاري التحميل...</td>
                                </tr>
                            ) : !data || data.students.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-500">لا يوجد طلاب يطابقون خيارات البحث المحددة</td>
                                </tr>
                            ) : (
                                data.students.map((st: any) => (
                                    <tr key={st._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{st.name}</div>
                                            {st.isFreeStudent && <div className="text-xs text-tawfeek-gold font-bold">طالب مجاني</div>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dir-ltr text-right">{st.phone}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium">
                                                {gradeLabel(st.grade)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                                    st.status === 'approved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : st.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-700 animate-pulse'
                                                        : st.status === 'rejected'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-200 text-gray-700'
                                                }`}
                                            >
                                                {st.status === 'approved'
                                                    ? 'مقبول'
                                                    : st.status === 'pending'
                                                    ? 'قيد الموافقة'
                                                    : st.status === 'rejected'
                                                    ? 'مرفوض'
                                                    : 'موقوف'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {st.isFreeStudent ? (
                                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">مجاني</span>
                                            ) : st.subscriptionStatus === 'active' ? (
                                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700">نشط</span>
                                            ) : st.subscriptionStatus === 'expired' ? (
                                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">منتهي</span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-500">لا يوجد</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-tawfeek-gold">
                                            <div className="flex items-center gap-2">
                                                <span>{st.points}</span>
                                                <button
                                                    onClick={() => handleAdjustPoints(st._id, st.name)}
                                                    title="إضافة أو خصم نقاط يدوياً"
                                                    className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold transition-colors"
                                                >
                                                    ✏️ تعديل
                                                </button>
                                                {st.points > 0 && (
                                                    <button
                                                        onClick={() => handleResetPoints(st._id, st.name, st.points)}
                                                        title="تصفير نقاط الطالب بالكامل إلى صفر"
                                                        className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 font-bold transition-colors"
                                                    >
                                                        🔄 تصفير
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    href={`/admin/students/${st._id}`}
                                                    className="text-xs bg-forest text-white px-2.5 py-1.5 rounded-lg hover:bg-forest/90 font-bold shadow-xs transition-colors flex items-center gap-1"
                                                    title="عرض الملف والمتابعة الشاملة"
                                                >
                                                    <span>👤</span>
                                                    <span>الملف والمتابعة</span>
                                                </Link>
                                                {st.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAction(st._id, 'approve')}
                                                            className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 font-bold border border-green-200"
                                                        >
                                                            موافقة
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(st._id, 'reject')}
                                                            className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold border border-red-200"
                                                        >
                                                            رفض
                                                        </button>
                                                    </>
                                                )}
                                                {st.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleAction(st._id, 'suspend')}
                                                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold border border-gray-300"
                                                    >
                                                        إيقاف
                                                    </button>
                                                )}
                                                {(st.status === 'suspended' || st.status === 'rejected') && (
                                                    <button
                                                        onClick={() => handleAction(st._id, 'activate')}
                                                        className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 font-bold border border-green-200"
                                                    >
                                                        تفعيل
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(st._id, st.name)}
                                                    className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100 font-bold border border-red-200 transition-colors"
                                                    title="حذف الطالب بشكل نهائي"
                                                >
                                                    🗑 حذف
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function AdminStudentsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500 animate-pulse">جاري تحميل بيانات الطلاب...</div>}>
            <StudentsListContent />
        </Suspense>
    );
}
