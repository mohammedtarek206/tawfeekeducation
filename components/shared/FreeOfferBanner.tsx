'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────

type OfferStatus = 'ACTIVE' | 'FULL' | 'DISABLED' | 'NOT_STARTED' | 'EXPIRED';

interface PublicOffer {
    id: string;
    title: string;
    description: string;
    maximumStudents: number;
    claimedStudents: number;
    remainingStudents: number;
    percentage: number;
    isFull: boolean;
    isActive: boolean;
    offerStatus: OfferStatus;
    durationInDays: number;
    cta: string;
    startDate: string | null;
    endDate: string | null;
    eligibleGrades: string[];
}

interface FreeOfferBannerProps {
    /** If provided, will be appended to register link as ?offerId=... */
    offerId?: string;
    /** Grade of current student (if logged in) — used to filter offer visibility */
    studentGrade?: string;
    /** Compact mode: smaller card for sidebars */
    compact?: boolean;
    /** Called when CTA is clicked — default navigates to /register */
    onClaim?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(days: number): string {
    if (days >= 365) return `${Math.round(days / 365)} سنة دراسية`;
    if (days >= 90) return `ترم دراسي (${days} يوم)`;
    if (days >= 30) return `${Math.round(days / 30)} شهر`;
    return `${days} يوم`;
}

function getCountdown(endDateStr: string | null): string | null {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `ينتهي خلال ${days} يوم${hours > 0 ? ` و${hours} ساعة` : ''}`;
    return `ينتهي خلال ${hours} ساعة`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeOfferBanner({
    offerId,
    studentGrade,
    compact = false,
    onClaim,
}: FreeOfferBannerProps) {
    const [offer, setOffer] = useState<PublicOffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState<string | null>(null);

    const fetchOffer = useCallback(async () => {
        try {
            const res = await fetch('/api/public/offers', { cache: 'no-store' });
            const data = await res.json();
            if (data.success && data.offers?.length > 0) {
                const o: PublicOffer = data.offers[0];

                // If a grade filter applies and student grade is known — check eligibility
                if (
                    studentGrade &&
                    o.eligibleGrades?.length > 0 &&
                    !o.eligibleGrades.includes(studentGrade)
                ) {
                    setOffer(null);
                } else {
                    setOffer(o);
                    setCountdown(getCountdown(o.endDate));
                }
            } else {
                setOffer(null);
            }
        } catch {
            setOffer(null);
        } finally {
            setLoading(false);
        }
    }, [studentGrade]);

    useEffect(() => {
        fetchOffer();
        const interval = setInterval(fetchOffer, 30_000);
        return () => clearInterval(interval);
    }, [fetchOffer]);

    // Update countdown every minute
    useEffect(() => {
        if (!offer?.endDate) return;
        const t = setInterval(() => setCountdown(getCountdown(offer.endDate)), 60_000);
        return () => clearInterval(t);
    }, [offer?.endDate]);

    // Don't render during loading OR when no offer
    if (loading) {
        return (
            <div className={`animate-pulse rounded-2xl bg-amber-50 border border-amber-200 ${compact ? 'p-4' : 'p-6'}`}>
                <div className="h-4 bg-amber-200/70 rounded w-2/3 mb-3" />
                <div className="h-6 bg-amber-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-amber-100 rounded w-full" />
            </div>
        );
    }

    if (!offer) return null;

    const progressColor =
        offer.percentage >= 90 ? '#ef4444' :
            offer.percentage >= 70 ? '#f97316' : '#16a34a';

    const registerHref = `/register${offerId ? `?offerId=${offerId}` : ''}`;

    // ─── Status: FULL ─────────────────────────────────────────────────────────
    if (offer.offerStatus === 'FULL') {
        return (
            <div className={`rounded-2xl border border-gray-200 bg-gray-50 ${compact ? 'p-4' : 'p-6'} text-center`}>
                <div className="text-2xl mb-2">🔒</div>
                <div className="font-black text-gray-500 text-sm mb-1">اكتمل العرض المجاني</div>
                <div className="text-xs text-gray-400 mb-3">تم حجز جميع المقاعد المجانية</div>
                <Link
                    href="/student/subscriptions"
                    className="inline-block text-xs font-bold text-forest hover:underline"
                >
                    تصفّح خطط الاشتراك الأخرى ←
                </Link>
            </div>
        );
    }

    // ─── Status: NOT_STARTED ──────────────────────────────────────────────────
    if (offer.offerStatus === 'NOT_STARTED') {
        return (
            <div className={`rounded-2xl border border-amber-200 bg-amber-50 ${compact ? 'p-4' : 'p-6'} text-center`}>
                <div className="text-2xl mb-2">⏳</div>
                <div className="font-black text-amber-700 text-sm mb-1">العرض لم يبدأ بعد</div>
                {offer.startDate && (
                    <div className="text-xs text-amber-600">
                        يبدأ في {new Date(offer.startDate).toLocaleDateString('ar-EG')}
                    </div>
                )}
            </div>
        );
    }

    // ─── Status: EXPIRED ──────────────────────────────────────────────────────
    if (offer.offerStatus === 'EXPIRED') {
        return (
            <div className={`rounded-2xl border border-gray-200 bg-gray-50 ${compact ? 'p-4' : 'p-6'} text-center`}>
                <div className="text-2xl mb-2">⌛</div>
                <div className="font-black text-gray-500 text-sm mb-1">انتهى العرض المجاني</div>
                <Link href="/student/subscriptions" className="text-xs font-bold text-forest hover:underline">
                    تصفّح خطط الاشتراك الأخرى ←
                </Link>
            </div>
        );
    }

    // ─── Status: ACTIVE ───────────────────────────────────────────────────────
    return (
        <div
            className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${compact ? 'p-4' : 'p-6'}`}
            style={{
                background: 'linear-gradient(135deg, #fffbf0 0%, #fff8e1 60%, #f0fff4 100%)',
                borderColor: 'rgba(201,162,39,0.4)',
                boxShadow: '0 8px 32px -8px rgba(201,162,39,0.2)',
            }}
        >
            {/* Golden top strip */}
            <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, #C9A227, #F59E0B, #C9A227)' }}
            />

            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎁</span>
                    <div>
                        {!compact && (
                            <div className="text-[10px] font-black text-amber-700 uppercase tracking-wide mb-0.5">
                                عرض خاص
                            </div>
                        )}
                        <div className={`font-black text-gray-900 leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                            {offer.title}
                        </div>
                    </div>
                </div>

                {/* Urgency badge */}
                {offer.percentage >= 70 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${offer.percentage >= 90
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-orange-100 text-orange-600'
                        }`}>
                        {offer.percentage >= 90 ? '⚡ أوشك' : '🔥 محدود'}
                    </span>
                )}
            </div>

            {/* Description */}
            {!compact && (
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{offer.description}</p>
            )}

            {/* Stats */}
            <div className="bg-white/70 rounded-xl p-3 mb-4 border border-amber-100/60">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">
                        تم حجز {offer.claimedStudents} من {offer.maximumStudents}
                    </span>
                    <span className="text-xs font-black" style={{ color: progressColor }}>
                        متبقي {offer.remainingStudents} مكان
                    </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            width: `${offer.percentage}%`,
                            background: `linear-gradient(90deg, ${progressColor}cc, ${progressColor})`,
                        }}
                    />
                </div>
            </div>

            {/* Duration + countdown */}
            {!compact && (offer.durationInDays > 0 || countdown) && (
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 flex-wrap">
                    {offer.durationInDays > 0 && (
                        <span>⏱ مدة الاشتراك: {formatDuration(offer.durationInDays)}</span>
                    )}
                    {countdown && (
                        <span className="text-amber-600 font-bold">🕐 {countdown}</span>
                    )}
                </div>
            )}

            {/* CTA */}
            {onClaim ? (
                <button
                    onClick={onClaim}
                    id="free-offer-banner-cta"
                    className="w-full py-2.5 rounded-xl font-black text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #C9A227, #F59E0B)',
                        boxShadow: '0 4px 16px -4px rgba(201,162,39,0.5)',
                    }}
                >
                    {offer.cta}
                </button>
            ) : (
                <Link
                    href={registerHref}
                    id="free-offer-banner-cta"
                    className="block w-full py-2.5 rounded-xl font-black text-sm text-white text-center transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #C9A227, #F59E0B)',
                        boxShadow: '0 4px 16px -4px rgba(201,162,39,0.5)',
                    }}
                >
                    {offer.cta}
                </Link>
            )}

            <p className="text-center text-[10px] text-gray-400 mt-2">
                🔒 العرض محمي — يُمنح فقط عند إكمال التسجيل والموافقة من الإدارة
            </p>
        </div>
    );
}
