import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
    const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج' });
    response.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
    return response;
}
