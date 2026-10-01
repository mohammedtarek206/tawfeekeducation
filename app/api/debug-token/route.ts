import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
    const token = req.cookies.get('auth_token')?.value;
    const jwtSecretStr = process.env.JWT_SECRET;

    if (!token) {
        return NextResponse.json({ error: 'No token found in cookies' }, { status: 400 });
    }

    if (!jwtSecretStr) {
        return NextResponse.json({ error: 'JWT_SECRET missing in env' });
    }

    try {
        const secret = new TextEncoder().encode(jwtSecretStr);
        const { payload, protectedHeader } = await jwtVerify(token, secret);

        return NextResponse.json({
            success: true,
            payload,
            header: protectedHeader,
            envSecretLength: jwtSecretStr.length
        });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            errorName: e.name,
            errorMessage: e.message,
            tokenPrefix: token.substring(0, 15) + '...',
        });
    }
}
