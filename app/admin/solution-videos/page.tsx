'use client';
export default function SolutionVideosAdminPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">فيديوهات الحل</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h2 className="font-bold mb-4">إعداد غلاف صفحة فيديوهات الحل</h2>
                <div className="flex gap-4 items-center">
                    <input type="file" className="input-field max-w-sm" />
                    <button className="btn-primary">رفع وحفظ صورة الغلاف</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold">إدارة فيديوهات الحل</h2>
                    <button className="btn-primary">+ إضافة فيديو جديد</button>
                </div>
                <div className="text-center py-10 text-gray-500">لا يوجد فيديوهات مضافة بعد.</div>
            </div>
        </div>
    );
}
