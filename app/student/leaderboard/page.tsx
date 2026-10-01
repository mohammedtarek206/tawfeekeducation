import React from 'react';

export default function LeaderboardPage() {
    return (
        <div className="space-y-6 max-w-[850px] mx-auto pt-4">
            <div className="w-full h-[180px] sm:h-[260px] md:h-[320px] rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-sm shadow-gray-200/50 border border-gray-100/50 relative group transition-transform duration-300 hover:scale-[1.01] bg-gradient-to-br from-gold to-yellow-500 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                <div className="text-white text-center relative z-10">
                    <div className="text-6xl mb-2 drop-shadow-lg">🏆</div>
                    <h1 className="text-3xl sm:text-5xl font-black drop-shadow-md">لوحة الشرف</h1>
                </div>
            </div>

            <div className="bg-white rounded-[16px] sm:rounded-[20px] shadow-sm border border-gray-100 p-6 sm:p-8 text-center animate-fadeIn transition-shadow hover:shadow-md">
                <h2 className="text-2xl font-black mb-3 text-gold-dark">أبطال منصة التوفيق</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                    استمر في التقدم والمذاكرة لحصد المزيد من النقاط الجغرافية وتصدر لوحة الشرف الأسبوعية!
                </p>
                <div className="text-center py-10 bg-offwhite rounded-xl border border-earth/20 text-gray-500 font-medium">
                    جاري تحديث لوحة الشرف بناءً على نقاط الطلاب المتصدرين... ستظهر قريباً!
                </div>
            </div>
        </div>
    );
}
