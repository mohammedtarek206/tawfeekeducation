'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const subjects = [
    {
        id: 'geography',
        label: 'الجغرافيا',
        tagline: 'اكتشف العالم من حولك',
        description: 'دراسة الظواهر الطبيعية والبشرية على الكرة الأرضية — من الأنهار والجبال إلى المدن والسكان.',
        icon: (
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" />
                <ellipse cx="24" cy="24" rx="10" ry="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <path d="M6 24h36M6 18h36M6 30h36" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
                <circle cx="30" cy="18" r="2.5" fill="#C9A227" />
            </svg>
        ),
        color: 'from-geo/10 to-geo/5',
        accent: '#356B7A',
        lessons: 42,
        badge: 'الأكثر تفاعلاً',
    },
    {
        id: 'history',
        label: 'التاريخ',
        tagline: 'اعرف الماضي لتفهم الحاضر',
        description: 'رحلة عبر الحضارات — من مصر القديمة إلى العصر الحديث، واكتشف كيف شكّلت الأحداث عالمنا اليوم.',
        icon: (
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Pillar / Column */}
                <rect x="16" y="8" width="16" height="3" rx="1" fill="currentColor" opacity="0.8" />
                <rect x="18" y="11" width="12" height="26" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="21" y1="14" x2="21" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <line x1="27" y1="14" x2="27" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <rect x="15" y="37" width="18" height="3" rx="1" fill="currentColor" opacity="0.8" />
                {/* Small clock */}
                <circle cx="37" cy="13" r="6" stroke="#C9A227" strokeWidth="1.5" fill="none" />
                <path d="M37 10v3l2 1.5" stroke="#C9A227" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
        ),
        color: 'from-gold/10 to-gold/5',
        accent: '#C9A227',
        lessons: 38,
        badge: 'الأكثر غنى',
    },
    {
        id: 'social',
        label: 'الدراسات الاجتماعية',
        tagline: 'افهم المجتمع والعالم من حولك',
        description: 'فهم العلاقات الإنسانية، الاقتصاد، السياسة، والمجتمع — أدوات لفهم العالم المعاصر.',
        icon: (
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="32" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="24" cy="32" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                <path d="M11 36c0-4 2.5-6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M37 36c0-4-2.5-6-5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="21" y1="27" x2="17" y2="23" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="27" y1="27" x2="31" y2="23" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
            </svg>
        ),
        color: 'from-forest/10 to-forest/5',
        accent: '#123C32',
        lessons: 31,
        badge: 'جديد هذا الموسم',
    },
];

export default function FeaturesSection() {
    const [counts, setCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        fetch('/api/public/subjects-stats')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.stats) {
                    setCounts(data.stats);
                }
            })
            .catch(() => { });
    }, []);

    return (
        <section id="subjects" className="py-24 bg-white relative overflow-hidden">
            {/* Subtle geometric background */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-40"
                    style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 left-0 w-96 h-80 rounded-full opacity-40"
                    style={{ background: 'radial-gradient(circle, rgba(53,107,122,0.07) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Section Header */}
                <div className="text-center mb-16">
                    <div className="section-label justify-center">
                        <span className="w-8 h-px bg-gold" />
                        عالم المعرفة
                        <span className="w-8 h-px bg-gold" />
                    </div>
                    <h2 className="section-title text-center">استكشف عالم المعرفة</h2>
                    <p className="section-subtitle mx-auto text-center">
                        ثلاث مواد متخصصة تغطي الجغرافيا والتاريخ والدراسات الاجتماعية بمنهج متكامل ومتفاعل.
                    </p>
                </div>

                {/* Subject Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {subjects.map((subject, i) => (
                        <div
                            key={subject.id}
                            id={`subject-card-${subject.id}`}
                            className="group relative bg-white border border-earth/60 rounded-2xl p-8 cursor-pointer transition-all duration-400 hover:-translate-y-2"
                            style={{ boxShadow: '0 2px 20px -4px rgba(18,60,50,0.08)', transitionDelay: `${i * 80}ms` }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px -12px ${subject.accent}30`;
                                (e.currentTarget as HTMLElement).style.borderColor = `${subject.accent}40`;
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 20px -4px rgba(18,60,50,0.08)';
                                (e.currentTarget as HTMLElement).style.borderColor = '';
                            }}
                        >
                            {/* Badge */}
                            <div className="absolute top-5 left-5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: `${subject.accent}15`, color: subject.accent }}>
                                {subject.badge}
                            </div>

                            {/* Icon */}
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                                style={{ background: `${subject.accent}12`, color: subject.accent }}
                            >
                                {subject.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-black text-darktext mb-1">{subject.label}</h3>
                            <p className="text-sm font-semibold mb-3" style={{ color: subject.accent }}>{subject.tagline}</p>
                            <p className="text-muted text-sm leading-relaxed mb-6">{subject.description}</p>

                            {/* Lessons count */}
                            <div className="flex items-center justify-between pt-5 border-t border-earth/50">
                                <span className="text-xs text-muted font-medium">{counts[subject.id] ?? subject.lessons} درساً متاحاً</span>
                                <Link
                                    href={`/student/subjects/${subject.id}`}
                                    className="flex items-center gap-1.5 text-sm font-bold transition-all duration-200 group/btn"
                                    style={{ color: subject.accent }}
                                >
                                    ابدأ الاستكشاف
                                    <svg className="w-4 h-4 rotate-180 transition-transform group-hover/btn:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>

                            {/* Hover bottom accent bar */}
                            <div
                                className="absolute bottom-0 right-0 left-0 h-1 rounded-b-2xl transition-all duration-300 scale-x-0 group-hover:scale-x-100 origin-right"
                                style={{ background: `linear-gradient(90deg, transparent, ${subject.accent})` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
