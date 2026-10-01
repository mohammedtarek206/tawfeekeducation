'use client';
import Link from 'next/link';
export default function LessonQuizzesAdminPage() {
    return (
        <div className="space-y-6 flex-1 h-full">
            <h1 className="text-2xl font-bold mb-4">اختبارات الحصص</h1>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h2 className="font-bold mb-4">إعداد غلاف صفحة اختبارات الحصص</h2>
                <div className="flex gap-4 items-center">
                    <input type="file" className="input-field max-w-sm" />
                    <button className="btn-primary">رفع وحفظ صورة الغلاف</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="mb-4 text-gray-600">لإنشاء وتعديل اختبارات الحصص الخاصة بالدروس، نظام الامتحانات يدعم ذلك بالفعل.</p>
                <Link href="/admin/exams" className="btn-primary inline-block">الانتقال إلى مدير الامتحانات والكويزات</Link>
            </div>
        </div>
    );
}
