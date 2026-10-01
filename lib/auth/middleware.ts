import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken, JWTPayload } from './jwt';

export type AuthenticatedRequest = NextRequest & {
    user: JWTPayload;
};

export interface ApiContext {
    params?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, context: any, user: JWTPayload) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler, requiredRoles?: string[]) {
    return async (req: NextRequest, context: ApiContext): Promise<NextResponse> => {
        const token = getTokenFromRequest(req);

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'يجب تسجيل الدخول أولاً' },
                { status: 401 }
            );
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { success: false, message: 'جلسة غير صالحة، يرجى تسجيل الدخول مجدداً' },
                { status: 401 }
            );
        }

        if (requiredRoles && !requiredRoles.includes(payload.role)) {
            return NextResponse.json(
                { success: false, message: 'غير مصرح لك بالوصول لهذا المورد' },
                { status: 403 }
            );
        }

        // Check account status for students
        if (payload.role === 'student' && payload.status !== 'approved') {
            const statusMessages: Record<string, string> = {
                pending: 'حسابك في انتظار موافقة الإدارة',
                rejected: 'تم رفض طلب تسجيلك',
                suspended: 'تم إيقاف حسابك، تواصل مع الإدارة',
            };
            return NextResponse.json(
                { success: false, message: statusMessages[payload.status] || 'حساب غير مفعل' },
                { status: 403 }
            );
        }

        return handler(req, context, payload);
    };
}

export function withAdmin(handler: RouteHandler) {
    return withAuth(handler, ['admin']);
}

export function withStudent(handler: RouteHandler) {
    return withAuth(handler, ['student']);
}

export function withParent(handler: RouteHandler) {
    return withAuth(handler, ['parent']);
}

export function withStudentOrParent(handler: RouteHandler) {
    return withAuth(handler, ['student', 'parent']);
}
