import React from 'react';
import Link from 'next/link';

export default function ExamsPage() {
    return (
        <div className="space-y-6 max-w-[850px] mx-auto pt-4">
            <div className="w-full h-[180px] sm:h-[260px] md:h-[320px] rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-sm shadow-gray-200/50 border border-gray-100/50 relative group transition-transform duration-300 hover:scale-[1.01] bg-gradient-to-br from-forest to-earth-dark flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                <h1 className="text-white text-4xl sm:text-5xl font-black relative z-10 drop-shadow-md">الامتحانات الشاملة</h1>
            </div>

            <div className="bg-white rounded-[16px] sm:rounded-[20px] shadow-sm border border-gray-100 p-6 sm:p-8 text-center animate-fadeIn transition-shadow hover:shadow-md">
                <h2 className="text-2xl sm:text-3xl font-black mb-3 text-forest">جاهز لاختبار قدراتك؟</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                    من هنا يمكنك الوصول إلى جميع الامتحانات الشاملة واستعراض نتائجك السابقة.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/student/weekly-exams" className="btn-primary shadow-sm shadow-forest/20 hover:-translate-y-0.5 transition-transform px-8 py-3">
                        الاختبارات الأسبوعية
                    </Link>
                    <Link href="/student/monthly-exams" className="btn-secondary hover:-translate-y-0.5 transition-transform px-8 py-3 bg-white text-forest border border-forest">
                        الاختبارات الشهرية
                    </Link>
                </div>
            </div>
        </div>
    );
}
