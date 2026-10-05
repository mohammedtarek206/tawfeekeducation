import connectDB from '@/lib/db/connect';
import Achievement from '@/lib/db/models/Achievement';
import StudentAchievement from '@/lib/db/models/StudentAchievement';
import LessonProgress from '@/lib/db/models/LessonProgress';
import ExamAttempt from '@/lib/db/models/ExamAttempt';
import StudentTask from '@/lib/db/models/StudentTask';
import User from '@/lib/db/models/User';

/**
 * Call this after any student activity to check and award achievements.
 * Idempotent – won't award same achievement twice.
 */
export async function checkAndAwardAchievements(studentId: string): Promise<void> {
    try {
        await connectDB();
        const achievements = await Achievement.find({ isPublished: true }).lean() as any[];
        if (!achievements.length) return;

        const student = await User.findById(studentId).select('points streak').lean() as any;
        if (!student) return;

        const completedLessons = await LessonProgress.countDocuments({ student: studentId, isCompleted: true });
        const completedExams = await ExamAttempt.countDocuments({ student: studentId, status: 'submitted' });
        const completedTasks = await StudentTask.countDocuments({ student: studentId, status: 'completed' });

        for (const ach of achievements) {
            // Skip if already earned
            const alreadyEarned = await StudentAchievement.findOne({ student: studentId, achievement: ach._id });
            if (alreadyEarned) continue;

            let progress = 0;
            switch (ach.category) {
                case 'lessons': progress = completedLessons; break;
                case 'exams': progress = completedExams; break;
                case 'streak': progress = student.streak || 0; break;
                case 'points': progress = student.points || 0; break;
                case 'general': progress = completedTasks; break;
            }

            if (progress >= ach.requiredCount) {
                try {
                    await StudentAchievement.create({
                        student: studentId,
                        achievement: ach._id,
                        earnedAt: new Date(),
                        pointsEarned: ach.pointsReward || 0,
                    });
                    if (ach.pointsReward > 0) {
                        await User.findByIdAndUpdate(studentId, { $inc: { points: ach.pointsReward } });
                    }
                    // Create notification
                    try {
                        const Notification = (await import('../db/models/Notification')).default;
                        await Notification.create({
                            user: studentId,
                            type: 'achievement',
                            title: `🏆 إنجاز جديد: ${ach.title}`,
                            message: ach.description,
                            isRead: false,
                        });
                    } catch { /* silent notification failure */ }
                } catch { /* duplicate key = already awarded, ignore */ }
            }
        }
    } catch (err) {
        console.error('[checkAndAwardAchievements] error:', err);
    }
}
