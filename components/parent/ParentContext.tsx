'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type Student = {
    _id: string;
    name: string;
    grade: string;
    status: string;
    subscriptionStatus: string;
    points: number;
    level: number;
    lastActivityDate?: string;
    avatar?: string;
};

type ParentContextType = {
    students: Student[];
    selectedStudent: Student | null;
    setSelectedStudentId: (id: string) => void;
    loading: boolean;
    refreshStudents: () => Promise<void>;
};

const ParentContext = createContext<ParentContextType>({
    students: [],
    selectedStudent: null,
    setSelectedStudentId: () => { },
    loading: true,
    refreshStudents: async () => { },
});

export const useParentContext = () => useContext(ParentContext);

export function ParentProvider({ children }: { children: React.ReactNode }) {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/parent/students');
            const data = await res.json();
            if (data.success && data.data.students) {
                setStudents(data.data.students);
                if (data.data.students.length > 0 && !selectedStudentId) {
                    setSelectedStudentId(data.data.students[0]._id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch linked students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const selectedStudent = students.find(s => s._id === selectedStudentId) || students[0] || null;

    return (
        <ParentContext.Provider value={{
            students,
            selectedStudent,
            setSelectedStudentId,
            loading,
            refreshStudents: fetchStudents
        }}>
            {children}
        </ParentContext.Provider>
    );
}
