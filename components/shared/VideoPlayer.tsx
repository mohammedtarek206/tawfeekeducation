'use client';

import { useState, useEffect, useRef } from 'react';
import { parseVideoUrl } from '@/lib/utils/videoEmbed';

interface VideoPlayerProps {
    src?: string;
    youtubeId?: string;
    youtubeUrl?: string;
    title?: string;
    studentName?: string;
    className?: string;
}

const WATERMARK_POSITIONS = [
    'bottom-6 right-6',
    'top-6 left-6',
    'bottom-6 left-6',
    'top-6 right-6',
];

export default function VideoPlayer({
    src,
    youtubeId,
    youtubeUrl,
    title = 'فيديو تعليمي',
    studentName,
    className = '',
}: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [posIndex, setPosIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Parse video info using centralized parser
    const targetUrl = youtubeUrl || src || '';
    const videoInfo = parseVideoUrl(targetUrl, youtubeId);

    // Reset state on targetUrl / videoId change
    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
    }, [targetUrl, youtubeId]);

    // Periodically shift watermark position to prevent static screen recording/cropping
    useEffect(() => {
        const interval = setInterval(() => {
            setPosIndex((prev) => (prev + 1) % WATERMARK_POSITIONS.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Fullscreen change listener to sync state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleCustomFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            } else if ((containerRef.current as any).webkitRequestFullscreen) {
                (containerRef.current as any).webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            }
        }
    };

    const currentPosClass = WATERMARK_POSITIONS[posIndex];

    return (
        <div
            ref={containerRef}
            className={`bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video border border-gray-800 select-none group/player ${className}`}
        >
            {/* Loading Indicator */}
            {isLoading && !hasError && videoInfo.embedUrl && (
                <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center text-white space-y-3">
                    <div className="w-10 h-10 border-4 border-tawfeek-green border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-gray-300">جاري تحميل مشغل الفيديو...</span>
                </div>
            )}

            {/* Error / Unavailable Fallback */}
            {hasError || (!videoInfo.embedUrl && !videoInfo.isDirectFile) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-black/95 z-20">
                    <div className="text-5xl mb-3">⚠️</div>
                    <p className="font-bold text-white text-base mb-1">عذراً، تعذر تشغيل هذا الفيديو</p>
                    <p className="text-xs text-gray-400 max-w-md">
                        قد يكون هناك مشكلة في إعدادات خصوصية الفيديو أو تم إزالته من قبل المنشئ.
                    </p>
                </div>
            ) : null}

            {/* Video Content Renderer */}
            {videoInfo.isDirectFile ? (
                <video
                    src={videoInfo.embedUrl || undefined}
                    controls
                    controlsList="nodownload"
                    onLoadedData={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    className="absolute top-0 left-0 w-full h-full object-contain"
                />
            ) : videoInfo.embedUrl ? (
                <iframe
                    src={videoInfo.embedUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    className="absolute top-0 left-0 w-full h-full border-0"
                />
            ) : null}

            {/* Moving Student Watermark Overlay */}
            {studentName && (
                <div
                    className={`absolute ${currentPosClass} transition-all duration-1000 z-30 pointer-events-none opacity-80 group-hover/player:opacity-100`}
                >
                    <div className="bg-black/75 backdrop-blur-md text-white text-xs md:text-sm font-extrabold px-3.5 py-1.5 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="tracking-wide">الطالب: {studentName}</span>
                    </div>
                </div>
            )}

            {/* Custom Fullscreen Toggle Button on Container Wrapper */}
            <button
                onClick={toggleCustomFullscreen}
                className="absolute bottom-3 left-3 z-30 bg-black/70 hover:bg-black text-white p-2 rounded-lg opacity-0 group-hover/player:opacity-100 transition-opacity backdrop-blur-sm border border-white/10"
                title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة مع العلامة المائية'}
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
