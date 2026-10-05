import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Lesson from '@/lib/db/models/Lesson';

export async function GET() {
    try {
        await connectDB();

        // Count published lessons mapped by subject — الجغرافيا مستثناة
        const statsAggregation = await Lesson.aggregate([
            { $match: { isPublished: true, subject: { $ne: 'geography' } } },
            { $group: { _id: "$subject", count: { $sum: 1 } } }
        ]);

        const stats: Record<string, number> = {};
        statsAggregation.forEach((item: any) => {
            // Remap subject IDs to UI IDs ('social_studies' -> 'social')
            const id = item._id === 'social_studies' ? 'social' : item._id;
            stats[id] = item.count;
        });

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        return NextResponse.json({ success: false, stats: {} });
    }
}
