'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { gradeLabel } from '@/lib/constants/grades';

interface HonorStudent {
    id: string;
    studentId: string;
    name: string;
    phone: string;
    grade: string;
    avatar: string | null;
    points: number;
    level: number;
    rank: number;
    note?: string;
    addedByName: string;
    createdAt: string;
}

interface SearchStudent {
    _id: string;
    name: string;
    phone: string;
    grade?: string;
    points?: number;
}

export default function AdminHonorBoardPage() {
    const [honoredStudents, setHonoredStudents] = useState<HonorStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Add Student Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<SearchStudent | null>(null);
    const [targetRank, setTargetRank] = useState<number>(1);
    const [honorNote, setHonorNote] = useState('');

    // Remove Confirmation Modal State
    const [studentToRemove, setStudentToRemove] = useState<HonorStudent | null>(null);
    const [removing, setRemoving] = useState(false);

    // Edit Rank State
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [editRankValue, setEditRankValue] = useState<number>(1);
    const [editNoteValue, setEditNoteValue] = useState<string>('');

    // Fetch honor board list
    const fetchHonorBoard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/honor-board');
            const json = await res.json();
            if (json.success) {
                const list: HonorStudent[] = json.data.leaderboard || [];
                setHonoredStudents(list);
                // Set default rank for adding a new student as list.length + 1
                setTargetRank(list.length + 1);
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل جلب بيانات لوحة الشرف' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم أثناء جلب لوحة الشرف' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHonorBoard();
    }, [fetchHonorBoard]);

    // Clear notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Search students for adding
    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (!q.trim() || q.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`/api/admin/students?status=approved&limit=15&search=${encodeURIComponent(q.trim())}`);
            const json = await res.json();
            if (json.success && json.data?.students) {
                setSearchResults(json.data.students);
            } else {
                setSearchResults([]);
            }
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    // Add student to honor board
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) {
            setNotification({ type: 'error', message: 'يرجى اختيار طالب أولاً' });
            return;
        }

        setActionLoading(true);
        setNotification(null);

        try {
            const res = await fetch('/api/admin/honor-board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudent._id,
                    rank: targetRank,
                    note: honorNote.trim(),
                }),
            });

            const json = await res.json();
            if (json.success) {
                setNotification({ type: 'success', message: json.message });
                setSelectedStudent(null);
                setSearchQuery('');
                setSearchResults([]);
                setHonorNote('');
                await fetchHonorBoard();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشلت إضافة الطالب' });
            }
        } catch {
            setNotification({ type: 'error', message: 'حدث خطأ في الاتصال بالخادم' });
        } finally {
            setActionLoading(false);
        }
    };

    // Remove student from honor board
    const handleRemoveStudent = async () => {
        if (!studentToRemove) return;

        setRemoving(true);
        try {
            const res = await fetch(`/api/admin/honor-board?studentId=${studentToRemove.studentId}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (json.success) {
                setNotification({ type: 'success', message: json.message });
                setStudentToRemove(null);
                await fetchHonorBoard();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشلت إزالة الطالب' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم' });
        } finally {
            setRemoving(false);
        }
    };

    // Quick move rank up or down
    const handleMoveRank = async (studentId: string, currentRank: number, direction: 'up' | 'down') => {
        const newRank = direction === 'up' ? currentRank - 1 : currentRank + 1;
        if (newRank < 1 || newRank > honoredStudents.length) return;

        // Find the adjacent student to swap ranks with
        const targetStudent = honoredStudents.find((s) => s.rank === newRank);
        if (!targetStudent) return;

        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/honor-board', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entries: [
                        { studentId, rank: newRank },
                        { studentId: targetStudent.studentId, rank: currentRank },
                    ],
                }),
            });
            const json = await res.json();
            if (json.success) {
                setNotification({ type: 'success', message: 'تم تحديث الترتيب بنجاح' });
                await fetchHonorBoard();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل تحديث الترتيب' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم' });
        } finally {
            setActionLoading(false);
        }
    };

    // Save individual edited rank and note
    const handleSaveRankEdit = async (studentId: string) => {
        if (editRankValue < 1) {
            setNotification({ type: 'error', message: 'المركز يجب أن يكون 1 أو أكثر' });
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/honor-board', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    rank: editRankValue,
                    note: editNoteValue,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setNotification({ type: 'success', message: json.message });
                setEditingStudentId(null);
                await fetchHonorBoard();
            } else {
                setNotification({ type: 'error', message: json.message || 'فشل تحديث المركز' });
            }
        } catch {
            setNotification({ type: 'error', message: 'خطأ في الاتصال بالخادم' });
        } finally {
            setActionLoading(false);
        }
    };

    const topOne = honoredStudents[0];

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span>🏆</span> إدارة لوحة الشرف
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        التحكم اليدوي الكامل في الطلاب المعتمدين وترتيب ظهورهم لجميع الطلاب في لوحة الشرف
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/student/leaderboard"
                        target="_blank"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <span>👁️</span>
                        <span>معاينة كما يراها الطالب</span>
                    </Link>
                    <button
                        onClick={fetchHonorBoard}
                        disabled={loading}
                        className="px-4 py-2 bg-forest hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
                    >
                        <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
                        <span>تحديث القائمة</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div
                    className={`rounded-2xl p-4 text-sm font-bold flex items-center justify-between shadow-sm animate-fadeIn ${
                        notification.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span>{notification.type === 'success' ? '✅' : '❌'}</span>
                        <span>{notification.message}</span>
                    </div>
                    <button
                        onClick={() => setNotification(null)}
                        className="text-gray-400 hover:text-gray-600 text-base"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="text-3xl mb-1">👥</div>
                    <div className="text-2xl font-black text-gray-900">{honoredStudents.length}</div>
                    <div className="text-xs font-bold text-gray-500 mt-1">طالب معتمد في لوحة الشرف</div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 shadow-sm p-5">
                    <div className="text-3xl mb-1">👑</div>
                    <div className="text-lg font-black text-amber-900 truncate">
                        {topOne ? topOne.name : 'لم يُحدد بعد'}
                    </div>
                    <div className="text-xs font-bold text-amber-700 mt-1">
                        صاحب المركز الأول {topOne ? `(${topOne.points} نقطة)` : ''}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="text-3xl mb-1">🎯</div>
                    <div className="text-2xl font-black text-emerald-800">تحكم يدوي</div>
                    <div className="text-xs font-bold text-gray-500 mt-1">الترتيب معتمد ومحدد بقرار الأدمن</div>
                </div>
            </div>

            {/* Section: Add Student Form */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="border-b border-gray-100 pb-4 mb-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>➕</span> إضافة طالب إلى لوحة الشرف
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        ابحث عن الطالب المسجل بالاسم أو الهاتف، وحدد مركزه والملاحظة لإدراجه مباشرة في لوحة الشرف
                    </p>
                </div>

                <form onSubmit={handleAddStudent} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Student Search & Select */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                البحث عن طالب بالاسم أو الهاتف <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="اكتب اسم الطالب أو رقم الهاتف..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                            />

                            {searching && (
                                <div className="absolute left-3 top-9 text-xs text-gray-400">
                                    جاري البحث...
                                </div>
                            )}

                            {/* Autocomplete Dropdown */}
                            {searchResults.length > 0 && !selectedStudent && (
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                                    {searchResults.map((s) => (
                                        <button
                                            key={s._id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedStudent(s);
                                                setSearchQuery(s.name);
                                                setSearchResults([]);
                                            }}
                                            className="w-full text-right p-3 hover:bg-gray-50 flex items-center justify-between text-sm transition-colors"
                                        >
                                            <div>
                                                <div className="font-bold text-gray-900">{s.name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {s.phone} • {gradeLabel(s.grade) || 'طالب'}
                                                </div>
                                            </div>
                                            <div className="text-left font-black text-forest text-xs">
                                                {s.points ?? 0} نقطة
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedStudent && (
                                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900">
                                    <span>
                                        الطالب المختار: <strong>{selectedStudent.name}</strong> ({selectedStudent.phone})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedStudent(null);
                                            setSearchQuery('');
                                        }}
                                        className="text-emerald-700 hover:text-red-600 mr-2"
                                    >
                                        إلغاء ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Rank Input */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                رقم المركز (الترتيب) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="999"
                                value={targetRank}
                                onChange={(e) => setTargetRank(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                إذا كان المركز محجوزاً، سيتم إزاحة المراكز التالية تلقائياً
                            </p>
                        </div>

                        {/* Note Input */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                ملاحظة أو لقب التميز (اختياري)
                            </label>
                            <input
                                type="text"
                                placeholder="مثال: الأول على الثانوية، مبدع الرياضيات..."
                                value={honorNote}
                                onChange={(e) => setHonorNote(e.target.value)}
                                maxLength={100}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={!selectedStudent || actionLoading}
                            className="px-6 py-2.5 bg-forest hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
                        >
                            {actionLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    <span>إضافة إلى لوحة الشرف</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Section: Honored Students List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            <span>📋</span> قائمة لوحة الشرف الحالية
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            الطلاب معروضون بالترتيب الفعلي كما يظهرون في حسابات الطلاب
                        </p>
                    </div>
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                        {honoredStudents.length} طلاب
                    </span>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-gray-400 text-sm font-medium">جاري تحميل القائمة...</p>
                    </div>
                ) : honoredStudents.length === 0 ? (
                    <div className="py-16 text-center p-6">
                        <div className="text-5xl mb-3">🏆</div>
                        <h3 className="text-base font-bold text-gray-800 mb-1">لا يوجد طلاب في لوحة الشرف بعد</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            استخدم النموذج أعلاه للبحث عن أي طالب وإضافته بالمركز الذي تريده
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 text-xs font-bold">
                                    <th className="px-5 py-3.5 text-right w-24">المركز</th>
                                    <th className="px-5 py-3.5 text-right">الطالب</th>
                                    <th className="px-5 py-3.5 text-right">الهاتف</th>
                                    <th className="px-5 py-3.5 text-right">الصف</th>
                                    <th className="px-5 py-3.5 text-center">النقاط الحالية</th>
                                    <th className="px-5 py-3.5 text-right">الملاحظة</th>
                                    <th className="px-5 py-3.5 text-center w-36">التحكم بالترتيب</th>
                                    <th className="px-5 py-3.5 text-center w-28">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {honoredStudents.map((item, index) => {
                                    const isTop3 = item.rank <= 3;
                                    const isEditing = editingStudentId === item.studentId;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-gray-50/70 transition-colors ${
                                                isTop3 ? 'bg-amber-50/20' : ''
                                            }`}
                                        >
                                            {/* Rank */}
                                            <td className="px-5 py-4 font-black">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editRankValue}
                                                        onChange={(e) =>
                                                            setEditRankValue(Math.max(1, parseInt(e.target.value) || 1))
                                                        }
                                                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-lg">
                                                            {item.rank === 1
                                                                ? '🥇'
                                                                : item.rank === 2
                                                                ? '🥈'
                                                                : item.rank === 3
                                                                ? '🥉'
                                                                : '⭐'}
                                                        </span>
                                                        <span
                                                            className={`font-black ${
                                                                item.rank === 1
                                                                    ? 'text-amber-600'
                                                                    : item.rank === 2
                                                                    ? 'text-slate-600'
                                                                    : item.rank === 3
                                                                    ? 'text-orange-600'
                                                                    : 'text-gray-700'
                                                            }`}
                                                        >
                                                            #{item.rank}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Name */}
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-[11px] text-gray-400">
                                                    أضافه: {item.addedByName}
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-5 py-4 text-xs font-mono text-gray-600 dir-ltr text-right">
                                                {item.phone || '—'}
                                            </td>

                                            {/* Grade */}
                                            <td className="px-5 py-4 text-xs text-gray-600">
                                                <span className="bg-gray-100 px-2 py-1 rounded-lg">
                                                    {gradeLabel(item.grade) || '—'}
                                                </span>
                                            </td>

                                            {/* Current Points */}
                                            <td className="px-5 py-4 text-center">
                                                <span className="font-black text-forest">
                                                    {item.points.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-gray-400 mr-1">نقطة</span>
                                            </td>

                                            {/* Note */}
                                            <td className="px-5 py-4 text-xs text-gray-700">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editNoteValue}
                                                        onChange={(e) => setEditNoteValue(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs"
                                                    />
                                                ) : item.note ? (
                                                    <span className="bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                                                        {item.note}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            {/* Reorder Controls */}
                                            <td className="px-5 py-4 text-center">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleSaveRankEdit(item.studentId)}
                                                            disabled={actionLoading}
                                                            className="px-2 py-1 bg-forest text-white rounded text-xs font-bold"
                                                        >
                                                            حفظ
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingStudentId(null)}
                                                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold"
                                                        >
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                handleMoveRank(item.studentId, item.rank, 'up')
                                                            }
                                                            disabled={actionLoading || index === 0}
                                                            title="تقديم المركز لأعلى"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-forest hover:text-white text-gray-700 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-30 disabled:hover:bg-gray-100 disabled:hover:text-gray-700"
                                                        >
                                                            ▲
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleMoveRank(item.studentId, item.rank, 'down')
                                                            }
                                                            disabled={
                                                                actionLoading ||
                                                                index === honoredStudents.length - 1
                                                            }
                                                            title="تأخير المركز لأسفل"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-forest hover:text-white text-gray-700 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-30 disabled:hover:bg-gray-100 disabled:hover:text-gray-700"
                                                        >
                                                            ▼
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingStudentId(item.studentId);
                                                                setEditRankValue(item.rank);
                                                                setEditNoteValue(item.note || '');
                                                            }}
                                                            title="تعديل المركز والملاحظة"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-amber-500 hover:text-white text-gray-700 flex items-center justify-center text-xs transition-colors"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Action: Remove */}
                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => setStudentToRemove(item)}
                                                    className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                                                >
                                                    إزالة 🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirmation Modal for Removing Student */}
            {studentToRemove && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
                            ⚠️
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg font-black text-gray-900">
                                إزالة الطالب من لوحة الشرف
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                هل أنت متأكد من إزالة الطالب{' '}
                                <strong className="text-gray-900">{studentToRemove.name}</strong> من لوحة الشرف؟
                            </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-semibold leading-relaxed">
                            💡 <strong>ملاحظة أمان:</strong> هذه العملية تزيل الطالب من قائمة لوحة الشرف فقط. لن يتم حذف حسابه أو نقاطه ({studentToRemove.points} نقطة) أو تقدمه بالمنصة.
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setStudentToRemove(null)}
                                disabled={removing}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleRemoveStudent}
                                disabled={removing}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                                {removing ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>جاري الإزالة...</span>
                                    </>
                                ) : (
                                    <span>تأكيد الإزالة</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
