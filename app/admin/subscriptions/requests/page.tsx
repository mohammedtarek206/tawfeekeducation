'use client';

import { useState, useEffect } from 'react';
import { gradeLabel } from '@/lib/constants/grades';
import { formatDateTime } from '@/lib/utils/helpers';


export default function AdminPaymentRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/subscriptions/requests${statusFilter ? `?status=${statusFilter}` : ''}`);
            const data = await res.json();
            if (data.success) {
                setRequests(data.data.requests);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [statusFilter]);

    const handleAction = async (id: string, status: 'approved' | 'rejected', adminNote?: string) => {
        try {
            const res = await fetch(`/api/admin/subscriptions/requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminNote }),
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchRequests();
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('حدث خطأ');
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-forest">طلبات الاشتراك والدفع</h1>

            <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                <button onClick={() => setStatusFilter('')} className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${statusFilter === '' ? 'bg-forest text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>الكل</button>
                <button onClick={() => setStatusFilter('pending')} className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>قيد المراجعة</button>
                <button onClick={() => setStatusFilter('approved')} className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${statusFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>المقبولة</button>
                <button onClick={() => setStatusFilter('rejected')} className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${statusFilter === 'rejected' ? 'bg-rose-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>المرفوضة</button>
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-500">جاري التحميل...</div>
            ) : (
                <div className="grid gap-6">
                    {requests.map((req: any) => (
                        <div key={req._id} className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-darktext">الطالب: {req.studentId?.name || 'غير معروف'}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'pending' ? 'bg-amber-100 text-amber-800' : req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                    </span>
                                </div>

                                <div className="text-gray-600 text-sm mb-1">الصف الدراسي: <span className="font-bold text-gray-800">{gradeLabel(req.studentId?.grade)}</span></div>
                                <div className="text-gray-600 text-sm mb-1">رقم الهاتف: <span className="font-mono">{req.studentId?.phone}</span></div>
                                <hr className="my-4" />
                                <div className="font-bold text-forest text-base mb-1">الباقة: {req.planId?.name || 'غير محددة'}</div>
                                <div className="text-tawfeek-green text-xl font-black mb-2">{req.amount} ج.م</div>
                                <div className="text-sm text-gray-600 mb-1">طريقة الدفع: <span className="font-semibold">{req.paymentMethod}</span></div>
                                {req.transactionRef && (
                                    <div className="text-sm text-gray-600 mb-1">رقم المعاملة / الملاحظة: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">{req.transactionRef}</span></div>
                                )}
                                <div className="text-xs text-gray-400 mt-2" suppressHydrationWarning>تاريخ الطلب: {formatDateTime(req.createdAt)}</div>


                                {req.adminNote && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-xl text-sm border border-red-100">
                                        <strong>ملاحظة الإدارة / سبب الرفض: </strong>
                                        {req.adminNote}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center justify-center border-l md:pl-6 pl-0 md:pt-0 pt-6">
                                <button
                                    onClick={() => setSelectedImage(req.paymentProof)}
                                    className="mb-4 text-blue-600 hover:underline"
                                >
                                    عرض إثبات الدفع
                                </button>

                                {req.status === 'pending' && (
                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => handleAction(req._id, 'approved')} className="flex-1 bg-green-500 text-white rounded-lg py-2 hover:bg-green-600">قبول</button>
                                        <button onClick={() => {
                                            const reason = prompt('سبب الرفض (اختياري)');
                                            if (reason !== null) handleAction(req._id, 'rejected', reason);
                                        }} className="flex-1 bg-red-500 text-white rounded-lg py-2 hover:bg-red-600">رفض</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
                            لا توجد طلبات
                        </div>
                    )}
                </div>
            )}

            {selectedImage && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full p-4">
                        <img src={selectedImage} alt="Payment Proof" className="w-full h-full object-contain" />
                        <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-4 text-white text-4xl">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
}
