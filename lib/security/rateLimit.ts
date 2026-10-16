import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// Simple in-memory rate limiter (replace with Redis for production)
const store = new Map<string, RateLimitEntry>();

export function rateLimit(options: {
    windowMs: number;
    max: number;
    keyGenerator?: (req: NextRequest) => string;
}) {
    return (req: NextRequest): NextResponse | null => {
        const key = options.keyGenerator
            ? options.keyGenerator(req)
            : req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

        const now = Date.now();
        const entry = store.get(key);

        if (!entry || entry.resetAt < now) {
            store.set(key, { count: 1, resetAt: now + options.windowMs });
            return null; // Allow
        }

        if (entry.count >= options.max) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'طلبات كثيرة جداً، حاول مرة أخرى بعد قليل',
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
                    },
                }
            );
        }

        entry.count += 1;
        return null; // Allow
    };
}

// Cleanup old entries every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(
        () => {
            const now = Date.now();
            store.forEach((entry, key) => {
                if (entry.resetAt < now) {
                    store.delete(key);
                }
            });
        },
        10 * 60 * 1000
    );
}

export const loginRateLimit = rateLimit({
    windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW || '900') * 1000,
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10'),
    keyGenerator: (req) =>
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
});

export const otpRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.OTP_MAX_REQUESTS_PER_HOUR || '5'),
});

// Rate limit for lesson/video API access: 60 requests per 5 minutes per IP
export const lessonApiRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.LESSON_API_RATE_LIMIT_MAX || '60'),
    keyGenerator: (req) =>
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
});
