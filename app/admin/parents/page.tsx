'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/helpers';


export default function AdminParentsPage() {
    const [parents, setParents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchParents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/parents?search=${search}`);
            const data = await res.json();
            if (data.success) {
                setParents(data.data.parents);
            }
        } catch (error) {
            console.error('Failed to fetch parents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParents();
    }, [search]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-earth/30">
                <h1 className="text-2xl font-black text-tawfeek-primary flex items-center gap-2">
                    👨‍👩‍👧‍👦 إدارة أولياء الأمور
                </h1>
                <input
                    type="text"
                    placeholder="بحث بالاسم أو الهاتف..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-tawfeek-primary transition-all"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-earth/30 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 font-bold animate-pulse">
                        جاري التحميل...
                    </div>
                ) : parents.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 font-medium">
                        لا يوجد أولياء أمور مسجلين (أو غير مطابقين للبحث).
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b border-earth/30">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-700 text-sm">أولياء الأمور</th>
                                    <th className="px-6 py-4 font-bold text-gray-700 text-sm">الهاتف</th>
                                    <th className="px-6 py-4 font-bold text-gray-700 text-sm">الطلاب المرتبطين</th>
                                    <th className="px-6 py-4 font-bold text-gray-700 text-sm">أنشئ في</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parents.map((parent) => (
                                    <tr key={parent._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{parent.name}</div>
                                            <div className="text-xs text-green-600 font-bold bg-green-50 inline-block px-2 py-0.5 rounded mt-1">
                                                {parent.status === 'approved' ? 'نشط' : 'معلق'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium dir-ltr text-right">
                                            {parent.phone}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {parent.linkedStudents?.length > 0 ? (
                                                    parent.linkedStudents.map((child: any) => (
                                                        <div key={child._id} className="text-sm bg-gray-100 px-3 py-1 rounded-full inline-block">
                                                            <span className="font-bold text-tawfeek-primary">{child.name}</span>
                                                            <span className="text-gray-500 text-xs mr-2">[{child.grade}]</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-gray-400">لا يوجد أبناء</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm" suppressHydrationWarning>
                                            {formatDate(parent.createdAt)}
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
