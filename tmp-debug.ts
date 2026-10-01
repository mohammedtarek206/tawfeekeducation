// File: tmp-debug.ts
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const uri = process.env.MONGODB_URI as string;
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const lesson = await db.collection('lessons').findOne({});
    const exam = await db.collection('exams').findOne({});
    const student = await db.collection('users').findOne({ role: 'student' });
    const adminUser = await db.collection('users').findOne({ role: 'admin' });

    console.log("== Lesson ==");
    console.dir(lesson);
    console.log("== Exam ==");
    console.dir(exam);
    console.log("== Student ==");
    console.dir(student);
    console.log("== Admin ==");
    console.dir(adminUser);

    process.exit(0);
}

run();
