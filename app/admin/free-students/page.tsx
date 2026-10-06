'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gradeLabel, ACTIVE_GRADES } from '@/lib/constants/grades';
import { formatDate } from '@/lib/utils/helpers';


export default function AdminFreeStudentsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');

    const fetchFreeStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('q', search);
            if (selectedGrade) params.append('grade', selectedGrade);

            const res = await fetch(`/api/admin/free-students?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFreeStudents();
    }, [selectedGrade]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchFreeStudents();
    };

    if (loading && !data) {
        return <div className="p-8 text-center text-gray-500 font-bold">جاري تحميل قائمة الطلاب المجانيين...</div>;
    }

    const stats = data?.stats || { freeStudentsCount: 0, freeStudentsLimit: 100, remainingSlots: 100, usagePercentage: 0 };
    const students = data?.students || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">سجل المستفيدين من العرض المجاني</h1>
                    <p className="text-gray-500 text-sm mt-1">عرض جميع الطلاب الذين حصلوا على مقاعد مجانية بالمنصة</p>
                </div>
                <Link href="/admin/settings" className="btn-primary text-sm self-start">
                    ⚙️ إعدادات العرض والحد الأقصى
                </Link>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 mb-1">الطلاب المجانيون المسجلون</div>
                    <div className="text-3xl font-black text-forest">
                        {stats.freeStudentsCount} <span className="text-lg text-gray-400">/ {stats.freeStudentsLimit}</span>
                    </div>
                </div>
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 mb-1">المقاعد المتبقية</div>
                    <div className="text-3xl font-black text-emerald-600">{stats.remainingSlots} مقعد</div>
                </div>
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 mb-1">نسبة الاستهلاك</div>
                    <div className="text-3xl font-black text-amber-600 mb-2">{stats.usagePercentage}%</div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, stats.usagePercentage)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto flex-1">
                    <input
                        type="text"
                        placeholder="ابحث باسم الطالب أو رقم الهاتف..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field max-w-md text-sm"
                    />
                    <button type="submit" className="btn-primary text-sm px-6 shrink-0">
                        بحث
                    </button>
                </form>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-600 shrink-0">تصفية حسب الصف:</label>
                    <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="input-field text-sm font-bold bg-white"
                    >
                        <option value="">جميع الصفوف الدراسية</option>
                        {ACTIVE_GRADES.map((g: any) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-offwhite/50 flex justify-between items-center">
                    <div className="font-bold text-gray-800 text-sm">
                        عرض {students.length} طالب مجاني
                    </div>
                </div>

                {students.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 font-bold">
                        لا يوجد طلاب مجانيون يطابقون خيارات البحث التصفية.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-4"># رقم المقعد</th>
                                    <th className="p-4">اسم الطالب</th>
                                    <th className="p-4">رقم الهاتف</th>
                                    <th className="p-4">الصف الدراسي</th>
                                    <th className="p-4">تاريخ التفعيل</th>
                                    <th className="p-4">تاريخ الانتهاء</th>
                                    <th className="p-4">حالة الاشتراك</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student: any) => (
                                    <tr key={student._id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-4 font-black font-mono text-tawfeek-green">
                                            #{student.freeSlotNumber || '-'}
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">{student.name}</td>
                                        <td className="p-4 font-mono dir-ltr text-right">{student.phone}</td>
                                        <td className="p-4">
                                            <span className="bg-forest/10 text-forest font-bold px-3 py-1 rounded-full text-xs">
                                                {gradeLabel(student.grade)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600 text-xs font-mono" suppressHydrationWarning>
                                            {student.subscriptionStartDate ? formatDate(student.subscriptionStartDate) : '-'}
                                        </td>
                                        <td className="p-4 text-gray-600 text-xs font-mono" suppressHydrationWarning>
                                            {student.subscriptionEndDate ? formatDate(student.subscriptionEndDate) : '-'}
                                        </td>

                                        <td className="p-4">
                                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                                                مجاني مفعّل
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
