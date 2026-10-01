'use client';

import { useState, useEffect } from 'react';

const DEFAULT_FORM = { name: '', number: '', accountName: '', instructions: '', active: true };

export default function AdminPaymentMethodsPage() {
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<any>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const fetchMethods = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/subscriptions/payment-methods');
            const data = await res.json();
            if (data.success) setMethods(data.data.paymentMethods);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMethods(); }, []);

    const openNew = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowModal(true); };
    const openEdit = (m: any) => { setForm(m); setEditingId(m._id); setShowModal(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editingId ? `/api/admin/subscriptions/payment-methods/${editingId}` : '/api/admin/subscriptions/payment-methods';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await res.json();
            alert(data.message);
            if (data.success) { setShowModal(false); fetchMethods(); }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        const res = await fetch(`/api/admin/subscriptions/payment-methods/${id}`, { method: 'DELETE' });
        const data = await res.json();
        alert(data.message);
        if (data.success) fetchMethods();
    };

    const f = (key: string, val: any) => setForm((prev: any) => ({ ...prev, [key]: val }));

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">طرق الدفع</h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة طرق الدفع المتاحة للطلاب</p>
                </div>
                <button onClick={openNew} className="bg-forest text-white px-5 py-2.5 rounded-xl font-bold hover:bg-forest/90 transition-colors shadow-sm">
                    + إضافة طريقة دفع
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">جاري التحميل...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {methods.map((m) => (
                        <div key={m._id} className={`bg-white rounded-2xl border shadow-sm p-6 ${!m.active ? 'opacity-60' : ''}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-black text-xl text-gray-900">{m.name}</h3>
                                    {m.accountName && <p className="text-sm text-gray-500 mt-0.5">{m.accountName}</p>}
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {m.active ? 'مفعل' : 'معطل'}
                                </span>
                            </div>
                            <div className="font-mono text-2xl font-bold text-forest mb-4 tracking-wider">{m.number}</div>
                            {m.instructions && (
                                <p className="text-gray-500 text-sm mb-4 leading-relaxed border-t pt-4">{m.instructions}</p>
                            )}
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <button onClick={() => openEdit(m)} className="flex-1 py-2 border border-forest text-forest rounded-lg text-sm font-bold hover:bg-forest/5 transition-colors">
                                    تعديل
                                </button>
                                <button onClick={() => handleDelete(m._id)} className="py-2 px-3 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}
                    {methods.length === 0 && (
                        <div className="col-span-2 text-center py-20 text-gray-400 bg-white rounded-2xl border">
                            لا توجد طرق دفع. انقر على &quot;إضافة طريقة دفع&quot; للبدء.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-black">{editingId ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">اسم الخدمة (مثل: فودافون كاش) *</label>
                                <input value={form.name} onChange={e => f('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">رقم الحساب / المحفظة *</label>
                                <input value={form.number} onChange={e => f('number', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30 font-mono" placeholder="01XXXXXXXXX" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">اسم صاحب الحساب</label>
                                <input value={form.accountName} onChange={e => f('accountName', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">تعليمات الدفع</label>
                                <textarea value={form.instructions} onChange={e => f('instructions', e.target.value)} rows={3} placeholder="قم بتحويل قيمة الاشتراك ثم ارفع إيصال التحويل..." className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} className="w-4 h-4 accent-green-500" />
                                مفعل (يظهر للطلاب)
                            </label>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">إلغاء</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-colors disabled:opacity-50">
                                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
