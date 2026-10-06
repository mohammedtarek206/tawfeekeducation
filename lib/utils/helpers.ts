import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { gradeLabel as getGradeLabel } from '@/lib/constants/grades';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
    if (n === null || n === undefined) return '0';
    return String(n);
}

export function formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

export function formatDateTime(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}


export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} ساعة`;
    return `${hours} ساعة ${mins} دقيقة`;
}

export function gradeLabel(grade: string): string {
    return getGradeLabel(grade);
}

export function statusLabel(status: string): string {
    const map: Record<string, string> = {
        pending: 'في الانتظار',
        approved: 'مفعل',
        rejected: 'مرفوض',
        suspended: 'موقوف',
    };
    return map[status] || status;
}

export function statusColor(status: string): string {
    const map: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        suspended: 'bg-gray-100 text-gray-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
}

export function dayLabel(day: string): string {
    const map: Record<string, string> = {
        saturday: 'السبت',
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
    };
    return map[day] || day;
}

export function extractYouTubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
}

export function generateReferralCode(name: string): string {
    const prefix = 'TAWFEEK';
    const namePart = name
        .replace(/\s+/g, '')
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, 'X');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${namePart}${random}`;
}

export function sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
}

export function truncate(str: string, limit: number): string {
    if (str.length <= limit) return str;
    return str.substring(0, limit) + '...';
}
