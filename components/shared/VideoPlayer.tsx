'use client';

import { useState, useEffect, useRef } from 'react';

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

    // Periodically shift watermark position to prevent screen capture cropping
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

    // Determine embed URL or video source
    let finalYoutubeId = youtubeId;
    if (!finalYoutubeId && youtubeUrl) {
        const match = youtubeUrl.match(
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        );
        if (match) finalYoutubeId = match[1];
    }

    const currentPosClass = WATERMARK_POSITIONS[posIndex];

    return (
        <div
            ref={containerRef}
            className={`bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video border border-gray-800 select-none group/player ${className}`}
        >
            {/* Video Content */}
            {finalYoutubeId ? (
                <iframe
                    src={`https://www.youtube.com/embed/${finalYoutubeId}?rel=0&modestbranding=1&enablejsapi=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full border-0"
                />
            ) : youtubeUrl && youtubeUrl.includes('drive.google.com') ? (
                <iframe
                    src={youtubeUrl.replace(/\/view.*$/, '/preview')}
                    title={title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full border-0"
                />
            ) : src || (youtubeUrl && (youtubeUrl.endsWith('.mp4') || youtubeUrl.endsWith('.webm'))) ? (
                <video
                    src={src || youtubeUrl}
                    controls
                    controlsList="nodownload"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                />
            ) : youtubeUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                    >
                        فتح رابط الفيديو الخارجي
                    </a>
                </div>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <div className="text-5xl mb-2">🎥</div>
                    <p>الفيديو غير متوفر</p>
                </div>
            )}

            {/* Moving Student Watermark Overlay */}
            {studentName && (
                <div
                    className={`absolute ${currentPosClass} transition-all duration-1000 z-30 pointer-events-none opacity-80 group-hover/player:opacity-100`}
                >
                    <div className="bg-black/70 backdrop-blur-md text-white text-xs md:text-sm font-extrabold px-3.5 py-1.5 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="tracking-wide">الطالب: {studentName}</span>
                    </div>
                </div>
            )}

            {/* Custom Fullscreen Toggle Button on Container Wrapper */}
            <button
                onClick={toggleCustomFullscreen}
                className="absolute bottom-3 left-3 z-30 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg opacity-0 group-hover/player:opacity-100 transition-opacity backdrop-blur-sm"
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
