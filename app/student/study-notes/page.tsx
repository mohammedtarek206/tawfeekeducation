'use client';
import { useEffect, useState } from 'react';
import { SUBJECTS, getSubjectLabel } from '@/lib/constants/subjects';
import { gradeLabel } from '@/lib/constants/grades';


export default function StudentStudyNotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');
    const [requireSubscription, setRequireSubscription] = useState(false);

    useEffect(() => {
        fetch('/api/student/study-notes')
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setNotes(res.data.notes);
                    setRequireSubscription(res.data.requireSubscription);
                }
                else setError(res.message || 'حدث خطأ');
            })
            .catch(() => setError('خطأ في الاتصال'))
            .finally(() => setLoading(false));
    }, []);

    const displayedNotes = notes.filter((note: any) => {
        if (filterSubject === 'all') return true;
        if (!note.subject || note.subject === 'uncategorized') return false;
        return note.subject === filterSubject;
    });

    return (
        <div className="space-y-6 max-w-[850px] mx-auto pt-4">
            <div className="w-full h-[180px] sm:h-[260px] md:h-[320px] rounded-[16px] sm:rounded-[20px] overflow-hidden shadow-sm shadow-gray-200/50 border border-gray-100/50 relative group transition-transform duration-300 hover:scale-[1.01]">
                <img src="/مذكره سوال وجواب-.jpg" alt="مذكرات سؤال وجواب" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none opacity-50" />
            </div>

            <div className="bg-white rounded-[16px] sm:rounded-[20px] shadow-sm border border-gray-100 p-6 animate-fadeIn">
                <h1 className="text-2xl font-black mb-2 text-forest">مذكرات سؤال وجواب</h1>
                <p className="text-gray-500 mb-6">مذكرات مراجعة متاحة لصفك الدراسي.</p>

                {/* Subject Filters (Tabs) */}
                <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar border-b border-gray-100 mb-6">
                    <button
                        onClick={() => setFilterSubject('all')}
                        className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${filterSubject === 'all'
                            ? 'bg-forest text-white shadow-md shadow-forest/20'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        كل المواد
                    </button>
                    {SUBJECTS.map((sub) => (
                        <button
                            key={sub.value}
                            onClick={() => setFilterSubject(sub.value)}
                            className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${filterSubject === sub.value
                                ? 'bg-forest text-white shadow-md shadow-forest/20'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {sub.label}
                        </button>
                    ))}
                </div>

                {loading && <div className="text-center py-10 text-gray-400 animate-pulse">جاري التحميل...</div>}
                {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>}

                {!loading && !error && displayedNotes.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-3">📚</div>
                        <p className="text-gray-500 font-medium">لا توجد مذكرات مطابقة حالياً</p>
                        <p className="text-xs text-gray-400 mt-1">ستظهر هنا بمجرد إضافتها من الأدمن</p>
                    </div>
                )}

                {requireSubscription && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center my-6">
                        <div className="text-4xl mb-3">🔒</div>
                        <h3 className="text-lg font-bold text-red-700 mb-2">محتوى حصري للمشتركين</h3>
                        <p className="text-sm text-red-600 mb-4">اشترك الآن للوصول إلى كافة المذكرات، الملخصات، والمراجعات النهائية.</p>
                        <a href="/student/subscriptions/plans" className="btn-primary bg-red-600 hover:bg-red-700 text-sm px-6 py-2">
                            عرض باقات الاشتراك
                        </a>
                    </div>
                )}

                {!loading && displayedNotes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayedNotes.map((note: any) => (
                            <a
                                key={note._id}
                                href={note.driveUrl || '#'}
                                target={note.driveUrl ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${note.driveUrl ? 'border-gray-100 hover:border-forest/50 hover:shadow-md cursor-pointer group relative overflow-hidden' : 'border-gray-100 opacity-60 cursor-not-allowed '}`}
                                onClick={(e) => {
                                    if (!note.driveUrl) {
                                        e.preventDefault();
                                        alert('تتطلب هذه المذكرة اشتراكاً فعالاً لفتحها.');
                                    }
                                }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-tawfeek-primary/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                                    📋
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 line-clamp-2 mb-1">{note.title}</h3>
                                    {note.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{note.description}</p>}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded bg-forest/20 text-forest text-xs font-bold whitespace-nowrap">
                                            {getSubjectLabel(note.subject)}
                                        </span>
                                        {note.driveUrl ? (
                                            <span className="text-xs text-forest font-bold group-hover:underline mr-auto">فتح المذكرة ↗</span>
                                        ) : (
                                            <span className="text-xs text-red-500 font-bold mr-auto">🔒 مقفول</span>
                                        )}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
