import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Settings from '@/lib/db/models/Settings';

/**
 * GET /api/public/video-settings
 * Returns only the video protection settings that are safe to expose to the client.
 * No authentication required — watermark visibility is a UX preference, not a security mechanism.
 * The actual access control (subscription check) always happens server-side on lesson fetch.
 */
export async function GET() {
    try {
        await connectDB();

        // Fetch only the specific video protection keys
        const settings = await Settings.find({
            key: { $in: ['video_watermark_enabled', 'video_watermark_fields', 'video_watermark_interval'] }
        }).lean();

        const result: Record<string, any> = {
            video_watermark_enabled: true,     // default on
            video_watermark_fields: 'name',    // default: name only
            video_watermark_interval: 8,       // default: 8 seconds
        };

        settings.forEach((s) => {
            result[s.key] = s.value;
        });

        return NextResponse.json({ success: true, data: result });
    } catch {
        // On any error, return safe defaults — watermark stays on
        return NextResponse.json({
            success: true,
            data: {
                video_watermark_enabled: true,
                video_watermark_fields: 'name',
                video_watermark_interval: 8,
            }
        });
    }
}
