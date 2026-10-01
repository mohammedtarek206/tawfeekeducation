'use client';

import { useEffect, useState } from 'react';

export default function AdminRewardsPage() {
    const [rewards, setRewards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        name: '',
        description: '',
        requiredPoints: 100,
        quantity: 10,
        category: 'gift',
    });

    const load = () => {
        setLoading(true);
        fetch('/api/admin/rewards')
            .then(r => r.json())
            .then(res => { if (res.success) setRewards(res.data?.rewards || []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('اسم الجائزة مطلوب'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/admin/rewards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) { setError(data.message || 'حدث خطأ'); return; }
            setSuccess('تم إضافة الجائزة بنجاح ✅');
            setShowForm(false);
            setForm({ name: '', description: '', requiredPoints: 100, quantity: 10, category: 'gift' });
            load();
            setTimeout(() => setSuccess(''), 3000);
        } catch { setError('حدث خطأ'); }
        finally { setSaving(false); }
    };

    const CATEGORY_LABELS: Record<string, string> = { gift: 'هدية', discount: 'خصم', digital: 'رقمي', other: 'أخرى' };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الجوائز والمكافآت</h1>
                    <p className="text-gray-500 mt-1">إدارة الجوائز التي يستطيع الطلاب استبدالها بنقاطهم</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary self-start">
                    {showForm ? '✕ إلغاء' : '+ إضافة جائزة'}
                </button>
            </div>

            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-bold text-sm">{success}</div>}

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-6">إضافة جائزة جديدة</h2>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="input-label">اسم الجائزة</label>
                            <input type="text" className="input-field" placeholder="مثال: شنطة مدرسية" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">الوصف</label>
                            <textarea rows={2} className="input-field resize-none" placeholder="وصف مختصر للجائزة..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="input-label">التصنيف</label>
                                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="gift">هدية</option>
                                    <option value="discount">خصم</option>
                                    <option value="digital">رقمي</option>
                                    <option value="other">أخرى</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">التكلفة بالنقاط</label>
                                <input type="number" min={1} className="input-field" value={form.requiredPoints} onChange={e => setForm({ ...form, requiredPoints: +e.target.value })} />
                            </div>
                            <div>
                                <label className="input-label">الكمية المتاحة</label>
                                <input type="number" min={0} className="input-field" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'جاري الحفظ...' : 'إضافة الجائزة'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)
                ) : rewards.length === 0 ? (
                    <div className="col-span-3 text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <div className="text-5xl mb-3">🎁</div>
                        <p className="text-gray-500">لا يوجد جوائز مضافة حتى الآن</p>
                    </div>
                ) : (
                    rewards.map((r: any) => (
                        <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 bg-tawfeek-primary/10 rounded-xl flex items-center justify-center text-2xl">🎁</div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {r.isActive ? 'متاح' : 'غير متاح'}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">{r.name}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{r.description}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="font-black text-tawfeek-primary">{r.requiredPoints} نقطة</span>
                                <span className="text-xs text-gray-500">متبقي: {r.quantity - r.redeemedCount}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
