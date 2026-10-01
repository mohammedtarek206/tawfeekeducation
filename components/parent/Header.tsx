'use client';
import { useRouter } from 'next/navigation';
import { useParentContext } from './ParentContext';

export default function Header() {
    const router = useRouter();
    const { students, selectedStudent, setSelectedStudentId, loading } = useParentContext();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/');
        } catch {
            router.push('/');
        }
    };

    return (
        <header className="bg-white border-b border-earth/30 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
                {/* Student Switcher */}
                <div className="flex items-center gap-3">
                    {loading ? (
                        <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-xl" />
                    ) : students.length > 0 ? (
                        <select
                            value={selectedStudent?._id || ''}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="bg-offwhite border border-earth/50 text-darktext font-bold text-sm sm:text-base rounded-xl px-4 py-2.5 outline-none focus:border-forest focus:ring-1 focus:ring-forest cursor-pointer shadow-inner"
                        >
                            {students.map((student) => (
                                <option key={student._id} value={student._id}>
                                    الطالب: {student.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="bg-red-50 text-red-600 font-bold px-4 py-2.5 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            لا يوجد طلاب مرتبطين بحسابك
                        </div>
                    )}
                </div>

                {/* Parent Profile & Logout */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold text-sm transition-all"
                    >
                        خروج
                    </button>
                </div>
            </div>
        </header>
    );
}
