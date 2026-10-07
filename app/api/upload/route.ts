import { NextRequest, NextResponse } from 'next/server';
import { withStudent } from '@/lib/auth/middleware';

// Allow up to 8MB request body for Base64 image uploads
export const maxDuration = 30;


const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

async function postHandler(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, message: 'لم يتم رفع ملف' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: 'نوع الملف غير مدعوم. الرجاء رفع صورة (JPG, PNG, WEBP)' },
                { status: 400 }
            );
        }

        // Validate file size
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB > MAX_SIZE_MB) {
            return NextResponse.json(
                { success: false, message: `حجم الصورة كبير جداً. الحد الأقصى ${MAX_SIZE_MB} ميجابايت` },
                { status: 400 }
            );
        }

        // Convert to Base64 — works on Vercel and any serverless environment
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUri = `data:${file.type};base64,${base64}`;

        return NextResponse.json({ success: true, url: dataUri });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, message: 'فشل معالجة الملف، يرجى إعادة المحاولة' }, { status: 500 });
    }
}

export const POST = withStudent(postHandler);

