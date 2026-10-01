import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const uri = process.env.MONGODB_URI as string;
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const exams = await db.collection('exams').find().sort({ _id: -1 }).limit(1).toArray();
    if (!exams.length) {
        console.log('No exams found.');
        return;
    }
    const exam = exams[0];
    console.log('Found exam:', exam._id, exam.title);

    const users = await db.collection('users').find({ role: 'admin' }).limit(1).toArray();
    const admin = users[0];

    const questionDoc = {
        text: 'Test Question',
        type: 'mcq',
        choices: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
        ],
        correctAnswer: 'A',
        points: 1,
        order: 0,
        examId: exam._id,
        subject: exam.subject || 'uncategorized',
        grade: exam.grade,
        createdBy: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        const result = await db.collection('questions').insertOne(questionDoc);
        console.log('Question inserted:', result.insertedId);

        await db.collection('exams').updateOne({ _id: exam._id }, { $push: { questions: result.insertedId } as any });
        console.log('Exam updated with question ID.');
    } catch (e) {
        console.error('Error inserting:', e);
    }

    process.exit(0);
}

run();
