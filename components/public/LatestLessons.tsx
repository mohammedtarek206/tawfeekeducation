'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { gradeLabel } from '@/lib/constants/grades';

const COLORS = ['#356B7A', '#C9A227', '#123C32', '#de554b', '#1a5f7a', '#a67b5b'];
const MAP_BADGE_COLOR = (i: number) => COLORS[i % COLORS.length];

function CourseCard({ course, index }: { course: any; index: number }) {
    const color = MAP_BADGE_COLOR(index);
    return (
        <div
            className="group bg-white border border-earth/60 rounded-2xl overflow-hidden transition-all duration-400 hover:-translate-y-1 block"
            style={{ boxShadow: '0 2px 20px -4px rgba(18,60,50,0.08)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 50px -8px ${color}28`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 20px -4px rgba(18,60,50,0.08)'; }}
        >
            <div className="relative h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full bg-forest/5 flex items-center justify-center text-4xl text-forest/20">🎬</div>
                )}

                <div
                    className="absolute top-3 right-3 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md"
                    style={{ background: color }}
                >
                    {course.subject || 'غير محدد'}
                </div>

                {course.isFree ? (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                        مجاني
                    </div>
                ) : (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                        للمشتركين
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col h-full">
                <div className="text-xs text-muted font-semibold mb-1.5">{gradeLabel(course.grade)}</div>
                <h3 className="text-lg font-black text-darktext mb-3 leading-tight">{course.title}</h3>

                <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px] flex-grow">
                    {course.description || 'لا يوجد وصف متاح'}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted mb-5">
                    <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{course.duration ? `${course.duration} دقيقة` : 'غير محدد'}</span>
                    </div>
                </div>

                <Link
                    href={`/lessons/${course._id}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all duration-300 hover:opacity-90 hover:shadow-lg active:scale-95"
                    style={{ background: color }}
                >
                    مشاهدة التفاصيل
                    <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}

export default function LatestLessons() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLessons = async () => {
            try {
                const res = await fetch('/api/public/lessons?limit=6');
                const data = await res.json();
                if (data.success) {
                    setCourses(data.data.lessons);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLessons();
    }, []);

    if (!loading && courses.length === 0) {
        return null; // hide section if no active lessons
    }

    return (
        <section id="courses" className="py-24 bg-offwhite relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none geo-grid-bg opacity-60" aria-hidden="true" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
                    <div>
                        <div className="section-label">
                            <span className="w-8 h-px bg-gold" />
                            شاهد أحدث الحصص
                        </div>
                        <h2 className="section-title mb-0">أحدث الإضافات للمنصة</h2>
                        <p className="text-muted mt-2">تصفّح أحدث الحصص التي تم إضافتها للمنصة وابدأ رحلة التعلم.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500 py-12">جاري التحميل...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courses.map((course: any, idx: number) => (
                            <CourseCard key={course._id} course={course} index={idx} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
