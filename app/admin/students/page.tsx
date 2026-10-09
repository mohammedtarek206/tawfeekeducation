'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';

export default function AdminStudentsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [grade, setGrade] = useState('');

    const loadData = () => {
        setLoading(true);
        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (status) query.append('status', status);
        if (grade) query.append('grade', grade);

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
    }, [status, grade]); // Reload on status change

    const handleAction = async (id: string, action: string) => {
        let rejectionReason = undefined;
        if (action === 'reject') {
            rejectionReason = prompt('اكتب سبب الرفض (سيظهر للطالب):');
            if (rejectionReason === null) return; // User cancelled
        } else {
            if (!confirm(`هل أنت متأكد من إجراء هذا الإجراء؟`)) return;
        }

        try {
            const res = await fetch(`/api/admin/students/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, rejectionReason })
            });
            const result = await res.json();
            if (result.success) {
                alert('تم بنجاح');
                loadData();
            } else {
                alert(result.message || 'حدث خطأ');
            }
        } catch (err) {
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
                body: JSON.stringify({ amount, reason: reason.trim() })
            });
            const result = await res.json();
            if (result.success) {
                alert(result.message);
                loadData();
            } else {
                alert(result.message || 'حدث خطأ في تعديل النقاط');
            }
        } catch (err) {
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
        } catch (err) {
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">إدارة الطلاب والموافقات</h1>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        className="input-field w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                    />
                </div>
                <select
                    className="input-field max-w-[200px]"
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
                    className="input-field max-w-[200px]"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                >
                    <option value="">كل الصفوف</option>
                    {ACTIVE_GRADES.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                </select>
                <button className="btn-primary shrink-0" onClick={loadData}>
                    بحث
                </button>
            </div>

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
                                    <td colSpan={7} className="text-center py-10 text-gray-500">لا يوجد طلاب يطابقون بحثك</td>
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
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold
                        ${st.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    st.status === 'pending' ? 'bg-yellow-100 text-yellow-700 animate-pulse' :
                                                        st.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                                                {st.status === 'approved' ? 'مقبول' : st.status === 'pending' ? 'قيد الموافقة' : st.status === 'rejected' ? 'مرفوض' : 'موقوف'}
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
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {st.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleAction(st._id, 'approve')} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 font-bold border border-green-200">
                                                            موافقة
                                                        </button>
                                                        <button onClick={() => handleAction(st._id, 'reject')} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold border border-red-200">
                                                            رفض
                                                        </button>
                                                    </>
                                                )}
                                                {st.status === 'approved' && (
                                                    <button onClick={() => handleAction(st._id, 'suspend')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold border border-gray-300">
                                                        إيقاف
                                                    </button>
                                                )}
                                                {(st.status === 'suspended' || st.status === 'rejected') && (
                                                    <button onClick={() => handleAction(st._id, 'activate')} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 font-bold border border-green-200">
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
