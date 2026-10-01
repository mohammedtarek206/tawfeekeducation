import React from 'react';
export default function Page() {
    return (
        <div className="space-y-6 max-w-[850px] mx-auto pt-4">
            {/* Premium Cover Image */}
            <div className="w-full h-[180px] sm:h-[280px] md:h-[340px] rounded-[20px] overflow-hidden shadow-lg shadow-gray-200/50 border border-gray-100/50 relative group transition-transform duration-300 hover:scale-[1.01]">
                <img
                    src="/فيديوهات الحل.jpg"
                    alt="غلاف صفحة: فيديوهات الحل"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none opacity-80" />
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-8 text-center animate-fadeIn transition-shadow hover:shadow-md">
                <h1 className="text-2xl sm:text-3xl font-black mb-3 text-forest">فيديوهات الحل</h1>
                <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                    راجع حلول الأسئلة بطريقة مبسطة واحترافية، وتعرف على أفكار المسائل خطوة بخطوة.
                </p>
                <button className="btn-primary shadow-lg shadow-forest/20 hover:-translate-y-0.5 transition-transform px-8">
                    استكشف الفيديوهات
                </button>
            </div>
        </div>
    );
}
