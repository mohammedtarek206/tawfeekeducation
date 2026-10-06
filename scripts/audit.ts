import path from 'path';
import fs from 'fs';

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                value = value.replace(/^"|"$/g, '');
            }
            process.env[key] = value.trim();
        }
    });
}

import connectDB from '../lib/db/connect';
import User from '../lib/db/models/User';
import Lesson from '../lib/db/models/Lesson';
import SolutionVideo from '../lib/db/models/SolutionVideo';
import Exam from '../lib/db/models/Exam';
import Quiz from '../lib/db/models/Quiz';
import Question from '../lib/db/models/Question';
import SubscriptionPlan from '../lib/db/models/SubscriptionPlan';
import Task from '../lib/db/models/Task';
import Material from '../lib/db/models/Material';
import mongoose from 'mongoose';

async function audit() {
    try {
        await connectDB();
        console.log('--- DATABASE AUDIT ---');

        const userGrades = await User.aggregate([
            { $group: { _id: '$grade', count: { $sum: 1 } } }
        ]);
        console.log('Users by Grade:', userGrades);

        const lessonGrades = await Lesson.aggregate([
            { $group: { _id: { grade: '$grade', isPublished: '$isPublished', subject: '$subject' }, count: { $sum: 1 } } }
        ]);
        console.log('Lessons by Grade:', lessonGrades);

        const videoGrades = await SolutionVideo.aggregate([
            { $group: { _id: { grade: '$grade', isPublished: '$isPublished' }, count: { $sum: 1 } } }
        ]);
        console.log('Solution Videos by Grade:', videoGrades);

        const examGrades = await Exam.aggregate([
            { $group: { _id: { grade: '$grade', isPublished: '$isPublished' }, count: { $sum: 1 } } }
        ]);
        console.log('Exams by Grade:', examGrades);

        const quizGrades = await Quiz.aggregate([
            { $group: { _id: { grade: '$grade', isPublished: '$isPublished' }, count: { $sum: 1 } } }
        ]);
        console.log('Quizzes by Grade:', quizGrades);

        const qGrades = await Question.aggregate([
            { $group: { _id: '$grade', count: { $sum: 1 } } }
        ]);
        console.log('Questions by Grade:', qGrades);

        const subGrades = await SubscriptionPlan.aggregate([
            { $group: { _id: { grade: '$grade', isActive: '$isActive' }, count: { $sum: 1 } } }
        ]);
        console.log('SubscriptionPlans by Grade:', subGrades);

        const taskGrades = await Task.aggregate([
            { $group: { _id: '$targetGrade', count: { $sum: 1 } } }
        ]);
        console.log('Tasks by Target Grade:', taskGrades);

        const matGrades = await Material.aggregate([
            { $group: { _id: '$grade', count: { $sum: 1 } } }
        ]);
        console.log('Materials by Grade:', matGrades);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Audit Error:', err);
        process.exit(1);
    }
}

audit();
