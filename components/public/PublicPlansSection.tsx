'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gradeLabel as getGradeLabel } from '@/lib/constants/grades';

function PublicPlanCard({ plan, freeStats }: { plan: any; freeStats: any }) {
    const isOfferActive = freeStats?.isOfferActive;
    const freeLimit = freeStats?.freeStudentsLimit || 100;
    const isFreePlan = plan.offerType === 'FREE_FIRST_N';

    return (
        <div className="relative group bg-white border-2 border-earth/30 rounded-3xl p-8 hover:border-gold hover:shadow-2xl transition-all duration-300">
            {plan.discountPercentage > 0 && (
                <div className="absolute -top-4 -right-4 w-20 h-20 overflow-hidden rounded-tr-3xl">
                    <div className="absolute top-4 -left-8 w-32 bg-red-500 text-white font-black text-xs py-1.5 text-center rotate-45 shadow-lg">
                        خصم {plan.discountPercentage}%
                    </div>
                </div>
            )}

            {isFreePlan && (
                <div className={`absolute -top-4 -left-4 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow-lg ${isOfferActive ? 'bg-emerald-600 animate-bounce' : 'bg-gray-500'}`}>
                    {isOfferActive ? `عرض مجاني لأول ${freeLimit} طالب!` : 'انتهى العرض المجاني'}
                </div>
            )}

            <div className="flex flex-col h-full">
                <div className="text-earth font-bold text-sm mb-2">{getGradeLabel(plan.grade)}</div>
                <h3 className="text-2xl font-black text-forest mb-4">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-6 flex-grow">{plan.description}</p>

                <div className="mb-6">
                    {isFreePlan && isOfferActive ? (
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-emerald-600">مجاناً</span>
                            <span className="text-gray-400 line-through text-lg font-bold mb-1">{plan.price} ج.م</span>
                        </div>
                    ) : (
                        <div className="flex items-end gap-2 text-forest">
                            <span className="text-4xl font-black">{plan.price}</span>
                            <span className="font-bold pb-1 text-gray-500 text-sm">جنية</span>
                            {plan.originalPrice && plan.price < plan.originalPrice && (
                                <span className="text-gray-400 line-through text-lg font-bold mb-1 mr-2">{plan.originalPrice} ج.م</span>
                            )}
                        </div>
                    )}
                </div>

                <ul className="mb-8 space-y-3">
                    {plan.features?.slice(0, 4).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{feature}</span>
                        </li>
                    ))}
                    {plan.features?.length > 4 && (
                        <li className="text-sm font-bold text-forest text-center opacity-70">
                            + المزيد من المزايا
                        </li>
                    )}
                </ul>

                <Link
                    href="/register"
                    className="mt-auto btn-primary w-full shadow-lg text-center justify-center flex py-3 rounded-xl"
                >
                    {isFreePlan && isOfferActive ? 'احصل عليها مجاناً' : 'اشترك الآن'}
                </Link>
            </div>
        </div>
    );
}

export default function PublicPlansSection() {
    const [plans, setPlans] = useState<any[]>([]);
    const [freeStats, setFreeStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/public/plans')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.data.plans) setPlans(data.data.plans);
                    if (data.data.freeStats) setFreeStats(data.data.freeStats);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading || plans.length === 0) return null;

    // Group plans by grade
    const groupedPlans = plans.reduce((acc, plan) => {
        if (!acc[plan.grade]) acc[plan.grade] = [];
        acc[plan.grade].push(plan);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <section className="py-24 bg-white relative">
            <div className="container mx-auto px-4 z-10 relative">
                <div className="text-center max-w-2xl mx-auto mb-16 animate-fadeInUp">
                    <span className="text-gold font-bold text-sm tracking-wider uppercase mb-3 block">الباقات والاشتراكات</span>
                    <h2 className="text-3xl md:text-5xl font-black text-forest mb-6">اختر باقتك التعليمية</h2>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        اختر الباقة المناسبة لمرحلتك الدراسية واستفد من أحدث المحتويات التعليمية والأسئلة والاختبارات الدورية.
                    </p>
                </div>

                <div className="space-y-16">
                    {Object.keys(groupedPlans).map(grade => {
                        const gradeName = getGradeLabel(grade);

                        return (
                            <div key={grade} className="animate-fadeInUp">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-px bg-earth/30 flex-1"></div>
                                    <h3 className="text-2xl font-black text-forest bg-offwhite px-6 py-2 rounded-full border border-earth/20">{gradeName}</h3>
                                    <div className="h-px bg-earth/30 flex-1"></div>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {groupedPlans[grade].map((plan: any) => (
                                        <PublicPlanCard key={plan._id} plan={plan} freeStats={freeStats} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
