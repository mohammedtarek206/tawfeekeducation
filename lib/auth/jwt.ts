import { SignJWT, jwtVerify as joseJwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET_STRING = process.env.JWT_SECRET!;
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: string;
    role: 'student' | 'parent' | 'admin';
    phone: string;
    status: string;
    [key: string]: any;
}

export async function signToken(payload: JWTPayload): Promise<string> {
    return await new SignJWT((payload as unknown) as NodeJS.Dict<string | number | boolean>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await joseJwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

export function setAuthCookie(token: string): void {
    const cookieStore = cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https'),
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

export function clearAuthCookie(): void {
    const cookieStore = cookies();
    cookieStore.delete('auth_token');
}

export function getTokenFromRequest(req: NextRequest): string | null {
    // Try Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // Try cookie
    return req.cookies.get('auth_token')?.value ?? null;
}

export function getTokenFromCookies(): string | null {
    const cookieStore = cookies();
    return cookieStore.get('auth_token')?.value ?? null;
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
    const token = getTokenFromCookies();
    if (!token) return null;
    return await verifyToken(token);
}
