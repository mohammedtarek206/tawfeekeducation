import mongoose from 'mongoose';
import connectDB from './lib/db/connect';
import Lesson from './lib/db/models/Lesson';

async function publishAll() {
    await connectDB();
    const result = await Lesson.updateMany({}, { $set: { isPublished: true } });
    console.log('Published lessons:', result);
    mongoose.disconnect();
}
publishAll();
