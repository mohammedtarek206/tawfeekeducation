import mongoose from 'mongoose';
import connectDB from './lib/db/connect';
import User from './lib/db/models/User';
import Lesson from './lib/db/models/Lesson';

async function check() {
    await connectDB();
    const student = await User.findOne({ role: 'student' }).sort({ createdAt: -1 });
    console.log('Last Student:', student ? { name: student.name, grade: student.grade } : 'none');

    const lessons = await Lesson.find();
    console.log('\nAll Lessons:');
    lessons.forEach(l => {
        console.log(`- ${l.title}: grade=${l.grade}, isPublished=${l.isPublished}`);
    });

    mongoose.disconnect();
}
check();
