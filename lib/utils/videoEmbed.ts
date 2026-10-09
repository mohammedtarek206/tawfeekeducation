/**
 * Video Embed Utility
 * Normalizes video URLs from YouTube, Dailymotion, Vimeo, Google Drive, and Direct Video links.
 */

export interface VideoEmbedInfo {
    provider: 'youtube' | 'dailymotion' | 'vimeo' | 'drive' | 'direct' | 'other';
    embedUrl: string | null;
    rawId: string | null;
    isDirectFile: boolean;
}

export function parseVideoUrl(url?: string, existingId?: string): VideoEmbedInfo {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return {
            provider: 'other',
            embedUrl: null,
            rawId: existingId || null,
            isDirectFile: false,
        };
    }

    const cleanUrl = url.trim();

    // 1. YouTube
    const ytMatch = cleanUrl.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    if (ytMatch || (existingId && existingId.length === 11)) {
        const id = ytMatch ? ytMatch[1] : existingId;
        const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
        return {
            provider: 'youtube',
            embedUrl: `https://www.youtube.com/embed/${id}?rel=0&playsinline=1&controls=1&enablejsapi=1${originParam}`,
            rawId: id || null,
            isDirectFile: false,
        };
    }

    // 2. Dailymotion (geo.dailymotion.com player or embed/video)
    if (cleanUrl.includes('dailymotion.com') || cleanUrl.includes('dai.ly') || cleanUrl.includes('geo.dailymotion.com')) {
        const dmMatch = cleanUrl.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/|video=)([a-zA-Z0-9]+)/);
        const id = dmMatch ? dmMatch[1] : existingId;
        const embedUrl = id
            ? `https://geo.dailymotion.com/player.html?video=${id}`
            : cleanUrl.includes('/embed/') ? cleanUrl : `https://www.dailymotion.com/embed/video/${id || ''}`;
        return {
            provider: 'dailymotion',
            embedUrl,
            rawId: id || null,
            isDirectFile: false,
        };
    }

    // 3. Vimeo
    if (cleanUrl.includes('vimeo.com')) {
        const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        const id = vimeoMatch ? vimeoMatch[1] : existingId;
        return {
            provider: 'vimeo',
            embedUrl: id ? `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0` : cleanUrl,
            rawId: id || null,
            isDirectFile: false,
        };
    }

    // 4. Cloudflare Stream / Custom iFrame Video Providers
    if (cleanUrl.includes('videodelivery.net') || cleanUrl.includes('cloudflarestream.com')) {
        return {
            provider: 'other',
            embedUrl: cleanUrl,
            rawId: null,
            isDirectFile: false,
        };
    }

    // 5. Google Drive
    if (cleanUrl.includes('drive.google.com')) {
        const embedUrl = cleanUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
        return {
            provider: 'drive',
            embedUrl,
            rawId: null,
            isDirectFile: false,
        };
    }

    // 6. Direct MP4 / WebM / Ogg
    if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg')) {
        return {
            provider: 'direct',
            embedUrl: cleanUrl,
            rawId: null,
            isDirectFile: true,
        };
    }

    // 7. Fallback generic embed or link
    return {
        provider: 'other',
        embedUrl: cleanUrl,
        rawId: null,
        isDirectFile: false,
    };
}
