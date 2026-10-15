'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parseVideoUrl } from '@/lib/utils/videoEmbed';

interface VideoPlayerProps {
    src?: string;
    youtubeId?: string;
    youtubeUrl?: string;
    title?: string;
    studentName?: string;
    className?: string;
    /** lessonId to persist watch progress via API */
    lessonId?: string;
    /** Initial progress (0-100) to restore last watched position */
    initialProgress?: number;
    /** Callback when video reaches completion threshold */
    onCompleted?: (percentage: number) => void;
}

const WATERMARK_POSITIONS = [
    'bottom-6 right-6',
    'top-6 left-6',
    'bottom-6 left-6',
    'top-6 right-6',
];

// How often to save progress to server (ms)
const SAVE_INTERVAL_MS = 15_000;
// Completion threshold
const COMPLETION_THRESHOLD = 90;

export default function VideoPlayer({
    src,
    youtubeId,
    youtubeUrl,
    title = 'فيديو تعليمي',
    studentName,
    className = '',
    lessonId,
    initialProgress = 0,
    onCompleted,
}: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSavedPctRef = useRef<number>(initialProgress);
    const completedFiredRef = useRef(false);

    const [posIndex, setPosIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [watchedPct, setWatchedPct] = useState(initialProgress);
    const [isCompleted, setIsCompleted] = useState(initialProgress >= COMPLETION_THRESHOLD);

    // Parse video info
    const targetUrl = youtubeUrl || src || '';
    const videoInfo = parseVideoUrl(targetUrl, youtubeId);
    const isYouTube = videoInfo.provider === 'youtube';

    // Add autoplay=0&enablejsapi=1&origin to YouTube URL for postMessage API
    const ytEmbedUrl = (() => {
        if (!isYouTube || !videoInfo.embedUrl) return videoInfo.embedUrl;
        const url = new URL(videoInfo.embedUrl);
        url.searchParams.set('enablejsapi', '1');
        url.searchParams.set('origin', typeof window !== 'undefined' ? window.location.origin : '');
        return url.toString();
    })();

    const embedUrl = isYouTube ? ytEmbedUrl : videoInfo.embedUrl;

    // ── Reset on video change ─────────────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        setWatchedPct(initialProgress);
        lastSavedPctRef.current = initialProgress;
        completedFiredRef.current = initialProgress >= COMPLETION_THRESHOLD;
        setIsCompleted(initialProgress >= COMPLETION_THRESHOLD);
    }, [targetUrl, youtubeId, initialProgress]);

    // ── Watermark rotation ────────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setPosIndex((prev) => (prev + 1) % WATERMARK_POSITIONS.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // ── Fullscreen listener ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        document.addEventListener('webkitfullscreenchange', handler);
        return () => {
            document.removeEventListener('fullscreenchange', handler);
            document.removeEventListener('webkitfullscreenchange', handler);
        };
    }, []);

    // ── Save progress to API ──────────────────────────────────────────────────
    const saveProgress = useCallback(async (pct: number) => {
        if (!lessonId || pct <= lastSavedPctRef.current) return;
        lastSavedPctRef.current = pct;
        try {
            await fetch('/api/student/lessons/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId,
                    watchedPercentage: pct,
                    lastWatchedPosition: 0, // not available from iframe
                }),
            });
            if (pct >= COMPLETION_THRESHOLD && !completedFiredRef.current) {
                completedFiredRef.current = true;
                setIsCompleted(true);
                onCompleted?.(pct);
            }
        } catch {
            /* silent — will retry next interval */
        }
    }, [lessonId, onCompleted]);

    // ── YouTube IFrame API via postMessage ────────────────────────────────────
    useEffect(() => {
        if (!isYouTube || !lessonId) return;

        let duration = 0;
        let isMounted = true;

        // Periodically ask YouTube player for currentTime
        const pollYT = () => {
            if (!iframeRef.current?.contentWindow) return;
            // getDuration
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'getDuration', args: [] }),
                '*'
            );
            // getCurrentTime
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
                '*'
            );
        };

        const handleMessage = (e: MessageEvent) => {
            if (!isMounted) return;
            try {
                let d: any;
                if (typeof e.data === 'string') {
                    d = JSON.parse(e.data);
                } else {
                    d = e.data;
                }

                // YouTube sends info object
                if (d?.info) {
                    const info = d.info;
                    if (info.duration) duration = info.duration;
                    const currentTime = info.currentTime ?? info.currentMediaTime;
                    if (currentTime && duration > 0) {
                        const pct = Math.min(100, Math.round((currentTime / duration) * 100));
                        setWatchedPct(pct);
                    }
                }
            } catch {
                /* non-JSON messages — ignore */
            }
        };

        window.addEventListener('message', handleMessage);

        // Poll every 5 seconds for currentTime
        const poller = setInterval(pollYT, 5000);

        // Save to API every SAVE_INTERVAL_MS
        saveTimerRef.current = setInterval(() => {
            setWatchedPct((currentPct) => {
                saveProgress(currentPct);
                return currentPct;
            });
        }, SAVE_INTERVAL_MS);

        return () => {
            isMounted = false;
            window.removeEventListener('message', handleMessage);
            clearInterval(poller);
            if (saveTimerRef.current) clearInterval(saveTimerRef.current);
        };
    }, [isYouTube, lessonId, saveProgress]);

    // ── Save on unmount ───────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (lessonId && watchedPct > lastSavedPctRef.current) {
                saveProgress(watchedPct);
            }
        };
        // Only run on unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Custom fullscreen toggle ──────────────────────────────────────────────
    const toggleCustomFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.() ??
                (containerRef.current as any).webkitRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() ??
                (document as any).webkitExitFullscreen?.();
        }
    };

    const currentPosClass = WATERMARK_POSITIONS[posIndex];

    return (
        <div
            ref={containerRef}
            className={`bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video border border-gray-800 select-none group/player ${className}`}
        >
            {/* Loading Indicator */}
            {isLoading && !hasError && embedUrl && (
                <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center text-white space-y-3">
                    <div className="w-10 h-10 border-4 border-tawfeek-green border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-gray-300">جاري تحميل مشغل الفيديو...</span>
                </div>
            )}

            {/* Error / Unavailable Fallback */}
            {(hasError || (!embedUrl && !videoInfo.isDirectFile)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-black/95 z-20">
                    <div className="text-5xl mb-3">⚠️</div>
                    <p className="font-bold text-white text-base mb-1">عذراً، تعذر تشغيل هذا الفيديو</p>
                    <p className="text-xs text-gray-400 max-w-md">
                        قد يكون هناك مشكلة في إعدادات خصوصية الفيديو أو تم إزالته من قبل المنشئ.
                    </p>
                </div>
            )}

            {/* Video Content */}
            {videoInfo.isDirectFile ? (
                <video
                    src={embedUrl || undefined}
                    controls
                    controlsList="nodownload"
                    onLoadedData={() => setIsLoading(false)}
                    onError={() => { setIsLoading(false); setHasError(true); }}
                    onTimeUpdate={(e) => {
                        const el = e.currentTarget;
                        if (!el.duration) return;
                        const pct = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
                        setWatchedPct(pct);
                    }}
                    className="absolute top-0 left-0 w-full h-full object-contain"
                />
            ) : embedUrl ? (
                <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={() => setIsLoading(false)}
                    onError={() => { setIsLoading(false); setHasError(true); }}
                    className="absolute top-0 left-0 w-full h-full border-0"
                />
            ) : null}

            {/* Progress bar (for lesson videos with lessonId) */}
            {lessonId && watchedPct > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30 pointer-events-none">
                    <div
                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-tawfeek-green' : 'bg-tawfeek-green/70'}`}
                        style={{ width: `${watchedPct}%` }}
                    />
                </div>
            )}

            {/* Completion badge */}
            {isCompleted && lessonId && (
                <div className="absolute top-3 left-3 z-30 bg-tawfeek-green text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow pointer-events-none flex items-center gap-1">
                    <span>✓</span> تمت المشاهدة
                </div>
            )}

            {/* Moving Student Watermark */}
            {studentName && (
                <div
                    className={`absolute ${currentPosClass} transition-all duration-1000 z-30 pointer-events-none opacity-75 group-hover/player:opacity-95`}
                >
                    <div className="bg-black/75 backdrop-blur-md text-white text-xs md:text-sm font-extrabold px-3.5 py-1.5 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="tracking-wide">{studentName}</span>
                    </div>
                </div>
            )}

            {/* Custom Fullscreen Button */}
            <button
                onClick={toggleCustomFullscreen}
                className="absolute bottom-3 left-3 z-30 bg-black/70 hover:bg-black text-white p-2 rounded-lg opacity-0 group-hover/player:opacity-100 transition-opacity backdrop-blur-sm border border-white/10"
                title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isFullscreen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 4l5 5m0 0l-5 0m5 0l0-5" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                </svg>
            </button>
        </div>
    );
}
