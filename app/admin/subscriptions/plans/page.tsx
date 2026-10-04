'use client';

import { useState, useEffect } from 'react';
import { ACTIVE_GRADES, gradeLabel } from '@/lib/constants/grades';


const DEFAULT_FORM = {
    name: '', grade: 'first_secondary', description: '',
    type: 'monthly', durationInDays: 30, price: 0, originalPrice: 0,
    discountPercentage: 0, offerEnabled: false, offerType: 'NONE',
    offerLimit: 0, features: '', active: true,
};

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<any>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/subscriptions/plans');
            const data = await res.json();
            if (data.success) setPlans(data.data.plans);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    const openNew = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowModal(true); };
    const openEdit = (plan: any) => {
        setForm({ ...plan, features: plan.features?.join('\n') || '' });
        setEditingId(plan._id);
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                originalPrice: Number(form.originalPrice),
                discountPercentage: Number(form.discountPercentage),
                durationInDays: Number(form.durationInDays),
                offerLimit: Number(form.offerLimit),
                features: typeof form.features === 'string'
                    ? form.features.split('\n').map((f: string) => f.trim()).filter(Boolean)
                    : form.features,
            };

            const url = editingId ? `/api/admin/subscriptions/plans/${editingId}` : '/api/admin/subscriptions/plans';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            alert(data.message);
            if (data.success) { setShowModal(false); fetchPlans(); }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        const res = await fetch(`/api/admin/subscriptions/plans/${id}`, { method: 'DELETE' });
        const data = await res.json();
        alert(data.message);
        if (data.success) fetchPlans();
    };

    const f = (key: string, val: any) => setForm((prev: any) => ({ ...prev, [key]: val }));

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">الباقات والاشتراكات</h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة باقات الاشتراك المتاحة للطلاب</p>
                </div>
                <button onClick={openNew} className="bg-forest text-white px-5 py-2.5 rounded-xl font-bold hover:bg-forest/90 transition-colors shadow-sm">
                    + إضافة باقة
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">جاري التحميل...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan._id} className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${!plan.active ? 'opacity-60' : ''}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-black text-lg text-gray-900">{plan.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {gradeLabel(plan.grade)}
                                    </p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${plan.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {plan.active ? 'مفعل' : 'معطل'}
                                </span>
                            </div>

                            <div className="text-3xl font-black text-forest mb-2">{plan.price} ج.م</div>
                            <div className="text-sm text-gray-500 mb-4">
                                {plan.type === 'monthly' ? 'شهري' : plan.type === 'term' ? 'ترم' : 'سنوي'} – {plan.durationInDays} يوم
                            </div>

                            {plan.offerEnabled && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-4">
                                    <span className="font-bold text-amber-700">عرض: </span>
                                    <span className="text-amber-600">
                                        {plan.offerType === 'FREE_FIRST_N' ? 'مجاني' : `خصم ${plan.discountPercentage}%`} لأول {plan.offerLimit} طالب
                                        <span className="mr-2 text-gray-500">({plan.offerUsed} استفادوا)</span>
                                    </span>
                                </div>
                            )}

                            {plan.features?.length > 0 && (
                                <ul className="space-y-1 mb-4 flex-grow">
                                    {plan.features.slice(0, 3).map((f: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-green-500">✓</span>{f}</li>
                                    ))}
                                    {plan.features.length > 3 && <li className="text-xs text-gray-400">+{plan.features.length - 3} مزايا أخرى</li>}
                                </ul>
                            )}

                            <div className="flex gap-2 mt-auto pt-4 border-t">
                                <button onClick={() => openEdit(plan)} className="flex-1 py-2 border border-forest text-forest rounded-lg text-sm font-bold hover:bg-forest/5 transition-colors">
                                    تعديل
                                </button>
                                <button onClick={() => handleDelete(plan._id)} className="py-2 px-3 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && (
                        <div className="col-span-3 text-center py-20 text-gray-400 bg-white rounded-2xl border">
                            لا توجد باقات . انقر على &quot;إضافة باقة&quot; للبدء.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-black">{editingId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold mb-1 text-gray-700">اسم الباقة *</label>
                                <input value={form.name} onChange={e => f('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">الصف الدراسي *</label>
                                <select value={form.grade} onChange={e => f('grade', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30">
                                    {ACTIVE_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">نوع الباقة *</label>
                                <select value={form.type} onChange={e => f('type', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30">
                                    <option value="monthly">شهري</option>
                                    <option value="term">ترم</option>
                                    <option value="yearly">سنوي</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">السعر (ج.م) *</label>
                                <input type="number" value={form.price} onChange={e => f('price', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">السعر الأصلي (ج.م)</label>
                                <input type="number" value={form.originalPrice} onChange={e => f('originalPrice', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">المدة (بالأيام) *</label>
                                <input type="number" value={form.durationInDays} onChange={e => f('durationInDays', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold mb-1 text-gray-700">الوصف</label>
                                <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold mb-1 text-gray-700">المزايا (كل مزية في سطر منفصل)</label>
                                <textarea value={form.features} onChange={e => f('features', e.target.value)} rows={4} placeholder="وصول كامل للحصص&#10;اختبارات تفاعلية&#10;..." className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest/30" />
                            </div>

                            {/* Offer Section */}
                            <div className="md:col-span-2 border rounded-xl p-4 bg-amber-50/50">
                                <label className="flex items-center gap-2 font-bold text-gray-700 mb-3 cursor-pointer">
                                    <input type="checkbox" checked={form.offerEnabled} onChange={e => f('offerEnabled', e.target.checked)} className="w-4 h-4 accent-amber-500" />
                                    تفعيل عرض خاص (مثلاً: مجاني لأول 100 طالب)
                                </label>
                                {form.offerEnabled && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-1 text-gray-700">نوع العرض</label>
                                            <select value={form.offerType} onChange={e => f('offerType', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30">
                                                <option value="FREE_FIRST_N">مجاني لأول N</option>
                                                <option value="DISCOUNT_FIRST_N">خصم لأول N</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-1 text-gray-700">عدد المستفيدين</label>
                                            <input type="number" value={form.offerLimit} onChange={e => f('offerLimit', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
                                        </div>
                                        {form.offerType === 'DISCOUNT_FIRST_N' && (
                                            <div>
                                                <label className="block text-sm font-bold mb-1 text-gray-700">نسبة الخصم (%)</label>
                                                <input type="number" value={form.discountPercentage} onChange={e => f('discountPercentage', e.target.value)} max={100} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} className="w-4 h-4 accent-green-500" />
                                    الباقة مفعلة (تظهر للطلاب)
                                </label>
                            </div>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">إلغاء</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-colors disabled:opacity-50">
                                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إنشاء الباقة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
