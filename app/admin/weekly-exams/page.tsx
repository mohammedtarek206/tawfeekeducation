'use client';
import Link from 'next/link';
export default function WeeklyExamsAdminPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">الاختبارات الأسبوعية</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h2 className="font-bold mb-4">إعداد غلاف صفحة الاختبارات الأسبوعية</h2>
                <div className="flex gap-4 items-center">
                    <input type="file" className="input-field max-w-sm" />
                    <button className="btn-primary">رفع وحفظ صورة الغلاف</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="mb-4 text-gray-600">لإنشاء وتعديل الاختبارات الأسبوعية، يمكنك استخدام نظام الامتحانات المركزي.</p>
                <Link href="/admin/exams" className="btn-primary inline-block">عبر نظام الامتحانات الشامل</Link>
            </div>
        </div>
    );
}
