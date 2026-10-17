'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parseVideoUrl } from '@/lib/utils/videoEmbed';

interface VideoPlayerProps {
    src?: string;
    youtubeId?: string;
    youtubeUrl?: string;
    title?: string;
    studentName?: string;
    /** If false, watermark is hidden regardless of studentName */
    watermarkEnabled?: boolean;
    /** Watermark display mode: 'name' | 'name_id' | 'name_grade' */
    watermarkFields?: 'name' | 'name_id' | 'name_grade';
    /** Last 4 chars of student ID (non-sensitive) */
    studentIdSuffix?: string;
    /** Student grade label (e.g. 'الثاني الثانوي') */
    studentGradeLabel?: string;
    /** Watermark rotation interval in seconds (default 8) */
    watermarkInterval?: number;
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
    'top-8 left-6',
    'bottom-6 left-6',
    'top-8 right-6',
    'top-1/2 left-6 -translate-y-1/2',
    'top-1/2 right-6 -translate-y-1/2',
];

// How often to save progress to server (ms)
const SAVE_INTERVAL_MS = 15_000;
// Completion threshold
const COMPLETION_THRESHOLD = 90;

// Build the watermark text from fields setting
function buildWatermarkText(
    name: string | undefined,
    fields: string,
    idSuffix?: string,
    gradeLabel?: string
): string {
    if (!name) return '';
    if (fields === 'name_id' && idSuffix) return `${name} · #***${idSuffix}`;
    if (fields === 'name_grade' && gradeLabel) return `${name} · ${gradeLabel}`;
    return name;
}

/**
 * Send YouTube player command via postMessage.
 * Only works if enablejsapi=1 is set in the embed URL.
 */
function ytCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
    iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
    );
}

export default function VideoPlayer({
    src,
    youtubeId,
    youtubeUrl,
    title = 'فيديو تعليمي',
    studentName,
    watermarkEnabled = true,
    watermarkFields = 'name',
    studentIdSuffix,
    studentGradeLabel,
    watermarkInterval = 8,
    className = '',
    lessonId,
    initialProgress = 0,
    onCompleted,
}: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSavedPctRef = useRef<number>(initialProgress);
    const completedFiredRef = useRef(false);
    // Track if getDisplayMedia interception is in place
    const originalGetDisplayMediaRef = useRef<typeof navigator.mediaDevices.getDisplayMedia | null>(null);

    const [posIndex, setPosIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [watchedPct, setWatchedPct] = useState(initialProgress);
    const [isCompleted, setIsCompleted] = useState(initialProgress >= COMPLETION_THRESHOLD);

    /**
     * PROTECTION OVERLAY STATES — documented clearly:
     *
     * captureDetected:  TRUE only when browser's getDisplayMedia() was called.
     *                   This is the ONLY reliable browser-level signal of screen sharing.
     *                   → Shows full black overlay + pauses video.
     *
     * pipDetected:      TRUE when a Document Picture-in-Picture window is opened.
     *                   This can be used to capture the player outside the normal context.
     *                   → Shows full black overlay + pauses video.
     *
     * tabHidden:        TRUE when the browser tab goes to background (Alt+Tab, minimize).
     *                   This is NOT proof of screen recording — user may just switch tasks.
     *                   → Only pauses video silently, does NOT show overlay.
     */
    const [captureDetected, setCaptureDetected] = useState(false);
    const [pipDetected, setPipDetected] = useState(false);
    // tabHidden only pauses playback — no overlay shown (not a capture signal)
    const tabHiddenRef = useRef(false);

    // Parse video info
    const targetUrl = youtubeUrl || src || '';
    const videoInfo = parseVideoUrl(targetUrl, youtubeId);
    const isYouTube = videoInfo.provider === 'youtube';

    // Add enablejsapi=1 & origin to YouTube URL for postMessage API
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
        setCaptureDetected(false);
        setPipDetected(false);
    }, [targetUrl, youtubeId, initialProgress]);

    // ── Watermark rotation ────────────────────────────────────────────────────
    useEffect(() => {
        const ms = Math.max(3000, (watermarkInterval || 8) * 1000);
        const interval = setInterval(() => {
            setPosIndex((prev) => (prev + 1) % WATERMARK_POSITIONS.length);
        }, ms);
        return () => clearInterval(interval);
    }, [watermarkInterval]);

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

    // ── Helper: log security event to server ──────────────────────────────────
    const logSecurityEvent = useCallback((eventType: 'screen_capture_detected' | 'pip_detected', context?: string) => {
        // Fire-and-forget — never block the UI
        fetch('/api/student/security-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType, lessonId, context }),
        }).catch(() => { });
    }, [lessonId]);

    // ── Helper: pause all media in the player ─────────────────────────────────
    const pauseAllMedia = useCallback(() => {
        // Pause YouTube via postMessage
        ytCommand(iframeRef.current, 'pauseVideo');
        // Pause direct video element
        if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }, []);

    // ── Anti Screen-Capture: intercept getDisplayMedia ────────────────────────
    /**
     * WHAT THIS DOES:
     *   Wraps the browser's screen-sharing API so we know when the user initiates
     *   a browser screen-share (e.g., Chrome's "Share tab" / "Share screen").
     *
     * WHAT IT CANNOT DO:
     *   - Stop OBS, hardware capture cards, or OS-level screen recorders
     *   - Stop mobile cameras pointed at the screen
     *   - Stop other browsers/processes that don't use the same JS context
     *
     * WHAT HAPPENS ON DETECTION:
     *   - The video is paused immediately
     *   - A black "protected content" overlay is shown
     *   - The event is logged server-side (audit log)
     *   - Once the share stream ends, the overlay is removed and video can resume
     */
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return;

        const original = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        originalGetDisplayMediaRef.current = original;

        (navigator.mediaDevices as any).getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
            // 1. Pause media immediately — before the share even starts
            pauseAllMedia();
            // 2. Show protection overlay
            setCaptureDetected(true);
            // 3. Log the event to the server (non-blocking)
            logSecurityEvent('screen_capture_detected', 'getDisplayMedia_intercepted');

            try {
                // 4. Let the capture proceed — we cannot block it from JS
                const stream = await original(constraints);

                // 5. When stream ends (user stops sharing), restore normal state
                const allTracks = stream.getTracks();
                const handleTrackEnd = () => {
                    // Only restore if ALL tracks have ended
                    if (allTracks.every(t => t.readyState === 'ended')) {
                        setCaptureDetected(false);
                    }
                };
                allTracks.forEach(track => {
                    track.addEventListener('ended', handleTrackEnd);
                });

                return stream;
            } catch {
                // User cancelled or denied — restore immediately
                setCaptureDetected(false);
                throw new Error('Screen capture cancelled or denied');
            }
        };

        return () => {
            // Restore original on unmount
            if (originalGetDisplayMediaRef.current) {
                (navigator.mediaDevices as any).getDisplayMedia = originalGetDisplayMediaRef.current;
            }
        };
    }, [pauseAllMedia, logSecurityEvent]);

    // ── Anti-Capture: Document Picture-in-Picture detection ───────────────────
    /**
     * WHAT THIS DOES:
     *   The Document Picture-in-Picture API (Chrome 116+) allows opening a
     *   detached window with full DOM, which could be used to capture the player
     *   outside the usual page context. We detect this and show the protection overlay.
     *
     * SUPPORTED: Chrome 116+, Edge 116+ on Desktop
     * NOT SUPPORTED: Firefox, Safari (no Document PiP API yet)
     */
    useEffect(() => {
        const pip = (window as any).documentPictureInPicture;
        if (!pip) return;

        const handleEnterPip = () => {
            pauseAllMedia();
            setPipDetected(true);
            logSecurityEvent('pip_detected', 'document_pip_opened');
        };

        const handleLeavePip = () => {
            setPipDetected(false);
        };

        pip.addEventListener('enter', handleEnterPip);

        // Listen for when any pip window closes
        if (pip.window) {
            pip.window.addEventListener('pagehide', handleLeavePip);
        }

        return () => {
            pip.removeEventListener('enter', handleEnterPip);
        };
    }, [pauseAllMedia, logSecurityEvent]);

    // ── Tab hidden: silently pause (NOT a capture signal — no overlay shown) ──
    /**
     * WHY: We pause the video when the tab goes to background as a UX courtesy
     * and minor deterrent. We do NOT show an overlay or treat this as a capture
     * event, because the user may simply be switching tasks.
     *
     * If you previously triggered a protection overlay on visibilitychange,
     * this has been intentionally removed: it caused false positives and annoyed
     * legitimate students while providing no real security benefit.
     */
    useEffect(() => {
        const handleVisibility = () => {
            const hidden = document.visibilityState === 'hidden';
            tabHiddenRef.current = hidden;
            if (hidden) {
                pauseAllMedia();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [pauseAllMedia]);

    /**
     * IMPORTANT: window.blur is explicitly NOT used as a capture/security signal.
     * It fires for too many legitimate reasons (opening DevTools, clicking another
     * app, etc.) and has no correlation with actual screen recording.
     *
     * It is NOT implemented here. The previous implementation that triggered an
     * overlay on window.blur has been intentionally removed.
     */

    // True protection overlay: only shown for getDisplayMedia or Document PiP
    const showProtectionOverlay = captureDetected || pipDetected;

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
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'getDuration', args: [] }),
                '*'
            );
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
    const watermarkLabel = buildWatermarkText(studentName, watermarkFields, studentIdSuffix, studentGradeLabel);

    return (
        <div
            ref={containerRef}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
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
                    ref={videoRef}
                    src={embedUrl || undefined}
                    controls
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
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
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={() => setIsLoading(false)}
                    onError={() => { setIsLoading(false); setHasError(true); }}
                    className="absolute top-0 left-0 w-full h-full border-0"
                />
            ) : null}

            {/* ── Anti Screen-Capture Protection Overlay ──────────────────────────
                WHEN SHOWN: Only when getDisplayMedia() is intercepted (browser screen 
                share) OR when Document PiP window is detected.

                WHAT IT DOES: Covers the entire video area with an opaque black 
                overlay. Since the overlay is applied in the DOM over the iframe/video,
                any browser-based screen recorder capturing this tab/window will see 
                the overlay instead of video content.

                LIMITATIONS:
                  • Cannot stop OS-level screen recorders (OBS, Windows Game Bar, etc.)
                  • Cannot stop external cameras pointed at the screen
                  • Cannot stop YouTube's own content via external YouTube.com access
                  • YouTube embed does NOT support DRM — the video stream itself is 
                    not encrypted at the CDN level for free embeds.

                FOR FULL DRM PROTECTION: Migrate to Cloudflare Stream, Bunny.net, 
                or Vimeo OTT which support Widevine/FairPlay DRM.
            ─────────────────────────────────────────────────────────────────── */}
            {showProtectionOverlay && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black">
                    <div className="text-center px-6 select-none">
                        <div className="text-5xl mb-4 grayscale">🔒</div>
                        <p className="text-white font-black text-lg mb-2">المحتوى محمي</p>
                        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                            {captureDetected
                                ? 'تم اكتشاف محاولة مشاركة الشاشة. أوقف مشاركة الشاشة لمتابعة المشاهدة.'
                                : 'تم اكتشاف نافذة Picture-in-Picture. أغلقها لمتابعة المشاهدة.'}
                        </p>
                        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-tawfeek-green font-bold">
                            <span className="w-2 h-2 rounded-full bg-tawfeek-green animate-pulse" />
                            محمي بواسطة منصة التوفيق
                        </div>
                        {studentName && (
                            <p className="mt-3 text-gray-600 text-[11px]">
                                الجلسة: {watermarkLabel || studentName}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── YouTube Click Blockers ─────────────────────────────────────────
                Transparent overlays (z-25) above the iframe that intercept pointer
                events before they reach YouTube's external navigation links.

                YouTube overlay zones (when hovering / paused):
                  TOP: [channel-avatar | video title (→ YT link) | share | settings]
                  BOTTOM: [▶ seek-bar ────────────── 🔊 ⚙ More-videos | YT-logo]

                Strategy:
                  • Full-width top strip  → blocks title + share + channel links
                  • Right side of bottom  → blocks YT logo + settings icon
                  • Full-width bottom strip → extra safety net for logo area
            ─────────────────────────────────────────────────────────────────── */}
            {isYouTube && !hasError && embedUrl && (
                <>
                    {/* ① FULL-WIDTH top bar — blocks the video title link, channel name,
                           share button, and all top-bar elements that navigate to YouTube.
                           Height 15% ≈ ~60px on a 400px-tall player  */}
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 z-[25]"
                        style={{ height: '15%', pointerEvents: 'auto', cursor: 'default' }}
                        onClickCapture={(e) => e.stopPropagation()}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                    />

                    {/* ② RIGHT side of bottom control bar — covers YT logo + settings.
                           Left portion (play / seek / volume) stays fully usable. */}
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 right-0 z-[25]"
                        style={{ width: '40%', height: '14%', pointerEvents: 'auto', cursor: 'default' }}
                        onClickCapture={(e) => e.stopPropagation()}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                    />

                    {/* ③ FULL-WIDTH thin strip at very bottom — catches logo hover area */}
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 z-[25]"
                        style={{ height: '7%', pointerEvents: 'auto', cursor: 'default' }}
                        onClickCapture={(e) => e.stopPropagation()}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                    />
                </>
            )}

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

            {/* ── Moving Student Watermark ────────────────────────────────────────
                PURPOSE: Forensic deterrent. If the video is captured by any means,
                the watermark identifies the student's session.
                
                DESIGN:
                  • Rotates through 6 positions every `watermarkInterval` seconds
                  • Semi-transparent with backdrop blur for readability
                  • z-40 (above click blockers, below protection overlay)
                  • pointer-events-none (never blocks video controls)
            ─────────────────────────────────────────────────────────────────── */}
            {watermarkEnabled && watermarkLabel && (
                <div
                    className={`absolute ${currentPosClass} transition-all duration-700 z-40 pointer-events-none`}
                    style={{ willChange: 'top, left, bottom, right' }}
                >
                    <div className="bg-black/70 backdrop-blur-md text-white text-[11px] md:text-xs font-extrabold px-3 py-1.5 rounded-xl border border-white/15 shadow-2xl flex items-center gap-2 opacity-70 hover:opacity-80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="tracking-wide">{watermarkLabel}</span>
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
