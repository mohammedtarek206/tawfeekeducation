// tmp-debug.ts
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkDb() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("No URL");
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const lessons = await db.collection('lessons').find({}).toArray();
    const users = await db.collection('users').find({ role: 'student' }).sort({ _id: -1 }).limit(5).toArray();

    let report = "=== LESSONS ===\n";
    report += `Total Lessons: ${lessons.length}\n`;
    lessons.forEach(l => {
        report += `Lesson: ${l.title} | Grade: '${l.grade}' | Published: ${l.isPublished} | Subject: '${l.subject}'\n`;
    });

    report += "\n=== LATEST STUDENTS ===\n";
    users.forEach(u => {
        report += `Student: ${u.name} | Grade: '${u.grade}' | Status: ${u.status}\n`;
    });

    console.log(report);
    process.exit(0);
}
checkDb();
