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
    /** Callback when watched percentage changes */
    onProgressUpdate?: (percentage: number) => void;
}

const WATERMARK_POSITIONS = [
    'bottom-6 right-6',
    'top-8 left-6',
    'bottom-6 left-6',
    'top-8 right-6',
    'top-1/2 left-6 -translate-y-1/2',
    'top-1/2 right-6 -translate-y-1/2',
];

/** Interval at which heartbeats are sent to the server (ms) */
const HEARTBEAT_INTERVAL_MS = 5_000;
/** Minimum watched % to show progress bar */
const SHOW_PROGRESS_THRESHOLD = 1;
/** Required % for completion */
const COMPLETION_REQUIRED_PCT = 50;

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

/**
 * Merge overlapping segments. Each segment is [startSec, endSec].
 */
function mergeSegments(segments: Array<[number, number]>): Array<[number, number]> {
    if (!segments.length) return [];
    const sorted = [...segments].sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        if (sorted[i][0] <= last[1] + 1) {
            last[1] = Math.max(last[1], sorted[i][1]);
        } else {
            merged.push(sorted[i]);
        }
    }
    return merged;
}

function sumSegments(segments: Array<[number, number]>): number {
    return segments.reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
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
    onProgressUpdate,
}: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const completedFiredRef = useRef(false);
    const originalGetDisplayMediaRef = useRef<typeof navigator.mediaDevices.getDisplayMedia | null>(null);

    // ── Segment tracking refs (mutable, not causing re-render) ────────────────
    /** All watched segments accumulated this session + previous sessions */
    const watchedSegmentsRef = useRef<Array<[number, number]>>([]);
    /** Current playing segment start time (null = not playing) */
    const currentSegmentStartRef = useRef<number | null>(null);
    /** Last known current time */
    const lastCurrentTimeRef = useRef<number>(0);
    /** Last known duration */
    const videoDurationRef = useRef<number>(0);
    /** Whether the video is currently playing */
    const isPlayingRef = useRef<boolean>(false);
    /** Computed unique watched % */
    const watchedPctRef = useRef<number>(initialProgress);

    const [posIndex, setPosIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    /** Watched percentage shown in UI (updated periodically) */
    const [watchedPct, setWatchedPct] = useState(initialProgress);
    const [isCompleted, setIsCompleted] = useState(initialProgress >= COMPLETION_REQUIRED_PCT);

    const [captureDetected, setCaptureDetected] = useState(false);
    const [pipDetected, setPipDetected] = useState(false);
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

    // ── Compute watched % from segments ───────────────────────────────────────
    const computeWatchedPct = useCallback((): number => {
        const duration = videoDurationRef.current;
        if (!duration || duration <= 0) return watchedPctRef.current;
        const segments = watchedSegmentsRef.current;
        const unique = sumSegments(mergeSegments(segments));
        const pct = Math.min(100, Math.round((unique / duration) * 100));
        return pct;
    }, []);

    // ── Flush current segment into watchedSegments ────────────────────────────
    const flushCurrentSegment = useCallback((currentTime: number) => {
        if (currentSegmentStartRef.current !== null) {
            const segStart = currentSegmentStartRef.current;
            const segEnd = Math.max(segStart, currentTime);
            if (segEnd - segStart >= 1) {
                watchedSegmentsRef.current = mergeSegments([
                    ...watchedSegmentsRef.current,
                    [segStart, segEnd],
                ]);
            }
            currentSegmentStartRef.current = null;
        }
    }, []);

    // ── Send heartbeat to server ──────────────────────────────────────────────
    const sendHeartbeat = useCallback(async () => {
        if (!lessonId || !isPlayingRef.current) return;

        const currentTime = lastCurrentTimeRef.current;
        const duration = videoDurationRef.current;
        if (!duration || duration <= 0 || currentSegmentStartRef.current === null) return;

        const segStart = currentSegmentStartRef.current;
        const segEnd = Math.max(segStart, currentTime);

        // Minimum 2 seconds to send
        if (segEnd - segStart < 2) return;

        try {
            const res = await fetch('/api/student/lessons/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId,
                    segmentStart: segStart,
                    segmentEnd: segEnd,
                    duration,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    const serverPct = data.data.watchedPercentage;
                    watchedPctRef.current = serverPct;
                    setWatchedPct(serverPct);
                    onProgressUpdate?.(serverPct);

                    if (serverPct >= COMPLETION_REQUIRED_PCT && !completedFiredRef.current) {
                        completedFiredRef.current = true;
                        setIsCompleted(true);
                        onCompleted?.(serverPct);
                    }
                }
            }
        } catch {
            /* silent — will retry on next heartbeat */
        }

        // Start a new segment from current position
        currentSegmentStartRef.current = segEnd;
    }, [lessonId, onCompleted, onProgressUpdate]);

    // ── Reset on video change ─────────────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        setWatchedPct(initialProgress);
        watchedPctRef.current = initialProgress;
        watchedSegmentsRef.current = [];
        currentSegmentStartRef.current = null;
        lastCurrentTimeRef.current = 0;
        videoDurationRef.current = 0;
        isPlayingRef.current = false;
        completedFiredRef.current = initialProgress >= COMPLETION_REQUIRED_PCT;
        setIsCompleted(initialProgress >= COMPLETION_REQUIRED_PCT);
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
        fetch('/api/student/security-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType, lessonId, context }),
        }).catch(() => { });
    }, [lessonId]);

    // ── Helper: pause all media in the player ─────────────────────────────────
    const pauseAllMedia = useCallback(() => {
        ytCommand(iframeRef.current, 'pauseVideo');
        if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }, []);

    // ── Anti Screen-Capture: intercept getDisplayMedia ────────────────────────
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return;

        const original = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        originalGetDisplayMediaRef.current = original;

        (navigator.mediaDevices as any).getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
            pauseAllMedia();
            setCaptureDetected(true);
            logSecurityEvent('screen_capture_detected', 'getDisplayMedia_intercepted');

            try {
                const stream = await original(constraints);
                const allTracks = stream.getTracks();
                const handleTrackEnd = () => {
                    if (allTracks.every(t => t.readyState === 'ended')) {
                        setCaptureDetected(false);
                    }
                };
                allTracks.forEach(track => {
                    track.addEventListener('ended', handleTrackEnd);
                });
                return stream;
            } catch {
                setCaptureDetected(false);
                throw new Error('Screen capture cancelled or denied');
            }
        };

        return () => {
            if (originalGetDisplayMediaRef.current) {
                (navigator.mediaDevices as any).getDisplayMedia = originalGetDisplayMediaRef.current;
            }
        };
    }, [pauseAllMedia, logSecurityEvent]);

    // ── Anti-Capture: Document Picture-in-Picture detection ───────────────────
    useEffect(() => {
        const pip = (window as any).documentPictureInPicture;
        if (!pip) return;

        const handleEnterPip = () => {
            pauseAllMedia();
            setPipDetected(true);
            logSecurityEvent('pip_detected', 'document_pip_opened');
        };
        const handleLeavePip = () => { setPipDetected(false); };

        pip.addEventListener('enter', handleEnterPip);
        if (pip.window) pip.window.addEventListener('pagehide', handleLeavePip);

        return () => { pip.removeEventListener('enter', handleEnterPip); };
    }, [pauseAllMedia, logSecurityEvent]);

    // ── Tab hidden: silently pause ────────────────────────────────────────────
    useEffect(() => {
        const handleVisibility = () => {
            const hidden = document.visibilityState === 'hidden';
            tabHiddenRef.current = hidden;
            if (hidden) {
                // Flush current segment before pausing
                flushCurrentSegment(lastCurrentTimeRef.current);
                isPlayingRef.current = false;
                pauseAllMedia();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [pauseAllMedia, flushCurrentSegment]);

    // ── YouTube IFrame API via postMessage — REAL segment tracking ────────────
    useEffect(() => {
        if (!isYouTube || !lessonId) return;

        let isMounted = true;
        let prevTime = 0;
        let prevPlayerState = -1; // -1 = unstarted

        const handleMessage = (e: MessageEvent) => {
            if (!isMounted) return;
            try {
                let d: any;
                if (typeof e.data === 'string') {
                    d = JSON.parse(e.data);
                } else {
                    d = e.data;
                }

                // ── YouTube state change ──────────────────────────────────────
                if (d?.event === 'onStateChange') {
                    const state = d.info; // 1=playing, 2=paused, 0=ended, -1=unstarted, 3=buffering
                    prevPlayerState = state;

                    if (state === 1) {
                        // Started playing — begin new segment
                        isPlayingRef.current = true;
                        if (currentSegmentStartRef.current === null) {
                            currentSegmentStartRef.current = lastCurrentTimeRef.current;
                        }
                    } else if (state === 2 || state === 0) {
                        // Paused or ended — flush current segment
                        isPlayingRef.current = false;
                        flushCurrentSegment(lastCurrentTimeRef.current);

                        // Update UI
                        const pct = computeWatchedPct();
                        setWatchedPct(pct);
                        onProgressUpdate?.(pct);
                    } else if (state === 3) {
                        // Buffering — keep segment open
                        isPlayingRef.current = false;
                    }
                }

                // ── YouTube info (currentTime, duration) ──────────────────────
                if (d?.info) {
                    const info = d.info;
                    if (info.duration && info.duration > 0) {
                        videoDurationRef.current = info.duration;
                    }

                    const currentTime = info.currentTime ?? info.currentMediaTime;
                    if (currentTime !== undefined && currentTime !== null) {
                        const ct = parseFloat(currentTime);

                        // Detect seek: big jump in time (> 5s skip forward or any backward)
                        const timeDiff = ct - prevTime;
                        const isSeeked = Math.abs(timeDiff) > 5 || timeDiff < 0;

                        if (isSeeked && isPlayingRef.current) {
                            // Flush the segment before the seek
                            flushCurrentSegment(prevTime);
                            // Start a new segment from the seeked position
                            currentSegmentStartRef.current = ct;
                        }

                        lastCurrentTimeRef.current = ct;
                        prevTime = ct;

                        // If playing, update segment in real-time for UI accuracy
                        if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
                            // Compute live % for UI (don't flush — just preview)
                            const previewSeg: [number, number] = [currentSegmentStartRef.current, ct];
                            const tempSegments = mergeSegments([...watchedSegmentsRef.current, previewSeg]);
                            const duration = videoDurationRef.current;
                            if (duration > 0) {
                                const unique = sumSegments(tempSegments);
                                const pct = Math.min(100, Math.round((unique / duration) * 100));
                                setWatchedPct(pct);
                                watchedPctRef.current = pct;
                            }
                        }
                    }
                }

            } catch {
                /* non-JSON messages — ignore */
            }
        };

        window.addEventListener('message', handleMessage);

        // Poll YouTube for state every 2 seconds
        const poller = setInterval(() => {
            if (!iframeRef.current?.contentWindow) return;
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'listening' }),
                '*'
            );
        }, 2000);

        // Heartbeat timer — sends segment to server every HEARTBEAT_INTERVAL_MS
        saveTimerRef.current = setInterval(() => {
            sendHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            isMounted = false;
            window.removeEventListener('message', handleMessage);
            clearInterval(poller);
            if (saveTimerRef.current) clearInterval(saveTimerRef.current);
            // Flush remaining segment on unmount
            flushCurrentSegment(lastCurrentTimeRef.current);
        };
    }, [isYouTube, lessonId, sendHeartbeat, flushCurrentSegment, computeWatchedPct, onProgressUpdate]);

    // ── Direct video element tracking ─────────────────────────────────────────
    const handleVideoPlay = useCallback(() => {
        isPlayingRef.current = true;
        if (currentSegmentStartRef.current === null) {
            currentSegmentStartRef.current = lastCurrentTimeRef.current;
        }
    }, []);

    const handleVideoPause = useCallback(() => {
        isPlayingRef.current = false;
        flushCurrentSegment(lastCurrentTimeRef.current);
        const pct = computeWatchedPct();
        setWatchedPct(pct);
        onProgressUpdate?.(pct);
    }, [flushCurrentSegment, computeWatchedPct, onProgressUpdate]);

    const handleVideoTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        const el = e.currentTarget;
        if (!el.duration) return;
        videoDurationRef.current = el.duration;

        const ct = el.currentTime;
        const timeDiff = ct - lastCurrentTimeRef.current;
        const isSeeked = Math.abs(timeDiff) > 5 || (timeDiff < 0 && Math.abs(timeDiff) > 0.5);

        if (isSeeked && isPlayingRef.current) {
            flushCurrentSegment(lastCurrentTimeRef.current);
            currentSegmentStartRef.current = ct;
        }

        lastCurrentTimeRef.current = ct;

        // Live UI update
        if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
            const previewSeg: [number, number] = [currentSegmentStartRef.current, ct];
            const tempSegments = mergeSegments([...watchedSegmentsRef.current, previewSeg]);
            const unique = sumSegments(tempSegments);
            const pct = Math.min(100, Math.round((unique / el.duration) * 100));
            setWatchedPct(pct);
            watchedPctRef.current = pct;
            onProgressUpdate?.(pct);

            if (pct >= COMPLETION_REQUIRED_PCT && !completedFiredRef.current) {
                completedFiredRef.current = true;
                setIsCompleted(true);
                onCompleted?.(pct);
            }
        }
    }, [flushCurrentSegment, onCompleted, onProgressUpdate]);

    const handleVideoEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        isPlayingRef.current = false;
        flushCurrentSegment(lastCurrentTimeRef.current);
        const pct = computeWatchedPct();
        setWatchedPct(pct);
        onProgressUpdate?.(pct);
        if (pct >= COMPLETION_REQUIRED_PCT && !completedFiredRef.current) {
            completedFiredRef.current = true;
            setIsCompleted(true);
            onCompleted?.(pct);
        }
    }, [flushCurrentSegment, computeWatchedPct, onCompleted, onProgressUpdate]);

    // ── Save on unmount ───────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            flushCurrentSegment(lastCurrentTimeRef.current);
            isPlayingRef.current = false;
        };
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

    const showProtectionOverlay = captureDetected || pipDetected;
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
                    onPlay={handleVideoPlay}
                    onPause={handleVideoPause}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onSeeked={(e) => {
                        // Seek handled in onTimeUpdate via big-jump detection
                        lastCurrentTimeRef.current = e.currentTarget.currentTime;
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

            {/* Protection Overlay */}
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

            {/* YouTube Click Blockers */}
            {isYouTube && !hasError && embedUrl && (
                <>
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 z-[25]"
                        style={{ height: '15%', pointerEvents: 'auto', cursor: 'default' }}
                        onClickCapture={(e) => e.stopPropagation()}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                    />
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 right-0 z-[25]"
                        style={{ width: '40%', height: '14%', pointerEvents: 'auto', cursor: 'default' }}
                        onClickCapture={(e) => e.stopPropagation()}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                    />
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 z-[25]"
                        style={{ height: '7%', pointerEvents: 'auto', cursor: 'default' }}
                        onClickCapture={(e) => e.stopPropagation()}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                    />
                </>
            )}

            {/* Progress bar */}
            {lessonId && watchedPct >= SHOW_PROGRESS_THRESHOLD && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30 pointer-events-none">
                    <div
                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-tawfeek-green' : watchedPct >= COMPLETION_REQUIRED_PCT ? 'bg-tawfeek-green' : 'bg-yellow-400'}`}
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

            {/* Watch progress indicator (shown while not completed) */}
            {lessonId && !isCompleted && watchedPct >= SHOW_PROGRESS_THRESHOLD && (
                <div className="absolute top-3 left-3 z-30 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow pointer-events-none flex items-center gap-1">
                    <span>👁</span> {watchedPct}% شُوهد
                </div>
            )}

            {/* Moving Student Watermark */}
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
