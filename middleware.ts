import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Helper to reliably get the JWT secret in edge environments
function getJwtSecret() {
    return new TextEncoder().encode(process.env.JWT_SECRET || 'tawfeek-super-secret-jwt-key-change-in-production-please-use-64-chars');
}

async function verifyEdgeToken(token: string) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload as any;
    } catch (error) {
        return null; // Invalid, expired, or malformed
    }
}

const AUTH_ROUTES = ['/login', '/register', '/verify-otp'];

export async function middleware(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl;
    const token = req.cookies.get('auth_token')?.value;

    /* ─── ADMIN ROUTES PROTECTION ─── */
    if (pathname.startsWith('/admin')) {
        let verifyError = 'none';
        let payload = null;

        if (token) {
            try {
                const result = await jwtVerify(token, getJwtSecret());
                payload = result.payload as any;
            } catch (err: any) {
                verifyError = err.code || err.name || 'UnknownError';
            }
        }

        const isValidAdmin = payload && payload.role === 'admin';

        // 1. If hitting exactly /admin
        if (pathname === '/admin') {
            if (isValidAdmin) {
                return NextResponse.redirect(new URL('/admin/dashboard', req.url));
            }
            const fallback = new URL('/admin/login', req.url);
            fallback.searchParams.set('reason', token ? 'unauthorized_or_expired' : 'no_token');
            if (verifyError !== 'none') fallback.searchParams.set('errCode', verifyError);
            return NextResponse.redirect(fallback);
        }

        // 2. If hitting /admin/login
        if (pathname === '/admin/login') {
            if (isValidAdmin) {
                return NextResponse.redirect(new URL('/admin/dashboard', req.url));
            }
            return NextResponse.next();
        }

        // 3. Any other /admin/* route (like /admin/dashboard)
        if (!isValidAdmin) {
            const fallback = new URL('/admin/login', req.url);
            fallback.searchParams.set('reason', token ? 'unauthorized_or_expired' : 'no_token');
            if (verifyError !== 'none') fallback.searchParams.set('errCode', verifyError);
            return NextResponse.redirect(fallback);
        }
    }

    /* ─── STUDENT ROUTES PROTECTION ─── */
    if (pathname.startsWith('/student')) {
        const payload = token ? await verifyEdgeToken(token) : null;

        if (!payload || payload.role !== 'student') {
            const loginUrl = new URL('/login', req.url);
            const targetUrl = pathname + req.nextUrl.search;
            loginUrl.searchParams.set('callbackUrl', targetUrl);
            return NextResponse.redirect(loginUrl);
        }

        if (payload.status === 'pending') {
            const pendingUrl = new URL('/pending', req.url);
            const planId = req.nextUrl.searchParams.get('planId') || (pathname.includes('/subscriptions/') ? pathname.split('/subscriptions/')[1]?.split('/')[0] : null);
            if (planId && planId !== 'checkout') pendingUrl.searchParams.set('planId', planId);
            return NextResponse.redirect(pendingUrl);
        }
        if (payload.status === 'rejected') {
            return NextResponse.redirect(new URL('/rejected', req.url));
        }
        if (payload.status === 'suspended') {
            return NextResponse.redirect(new URL('/suspended', req.url));
        }
    }

    /* ─── PARENT ROUTES PROTECTION ─── */
    if (pathname.startsWith('/parent') && !['/parent/login', '/parent/register'].includes(pathname)) {
        const payload = token ? await verifyEdgeToken(token) : null;
        if (!payload || payload.role !== 'parent') {
            return NextResponse.redirect(new URL('/parent/login', req.url));
        }
    }

    /* ─── PUBLIC AUTH ROUTES (Login/Register for students) ─── */
    if (AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(route))) {
        if (token) {
            const payload = await verifyEdgeToken(token);
            if (payload) {
                if (payload.role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', req.url));
                if (payload.role === 'parent') return NextResponse.redirect(new URL('/parent/dashboard', req.url));
                if (payload.role === 'student') {
                    if (payload.status === 'pending') {
                        const pendingUrl = new URL('/pending', req.url);
                        const planId = req.nextUrl.searchParams.get('planId');
                        if (planId) pendingUrl.searchParams.set('planId', planId);
                        return NextResponse.redirect(pendingUrl);
                    }
                    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
                    const planId = req.nextUrl.searchParams.get('planId');
                    if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
                        return NextResponse.redirect(new URL(callbackUrl, req.url));
                    }
                    if (planId) {
                        return NextResponse.redirect(new URL(`/student/subscriptions/${planId}/checkout`, req.url));
                    }
                    return NextResponse.redirect(new URL('/student/dashboard', req.url));
                }
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    // Mathing relevant routes to prevent middleware running on static files/assets
    matcher: [
        '/admin/:path*',
        '/student/:path*',
        '/parent/:path*',
        '/login',
        '/register',
        '/verify-otp',
    ],
};
