import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { withStudent } from '@/lib/auth/middleware';
import fs from 'fs';

async function postHandler(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, message: 'لم يتم رفع ملف' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'png';
        const filename = `${crypto.randomUUID()}.${ext}`;
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        return NextResponse.json({ success: true, url: `/uploads/${filename}` });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, message: 'فشل رفع الملف' }, { status: 500 });
    }
}

export const POST = withStudent(postHandler);
