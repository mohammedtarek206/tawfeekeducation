// الجغرافيا تم أرشفتها — لا تظهر في أي قائمة أو API
export const SUBJECTS = [
    { value: 'history', label: 'التاريخ' },
    { value: 'social_studies', label: 'الدراسات الاجتماعية' },
];

// قيم المواد النشطة (بدون جغرافيا)
export const SUBJECT_VALUES = SUBJECTS.map(s => s.value);

// دالة مساعدة تدعم العرض القديم للجغرافيا (archive display) لكن لا تضيفها للقوائم
export const getSubjectLabel = (value: string) => {
    if (value === 'geography') return 'الجغرافيا (مؤرشف)';
    return SUBJECTS.find(s => s.value === value)?.label || 'غير مصنف';
};
