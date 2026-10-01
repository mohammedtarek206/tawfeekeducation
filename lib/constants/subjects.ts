export const SUBJECTS = [
    { value: 'history', label: 'التاريخ' },
    { value: 'geography', label: 'الجغرافيا' },
    { value: 'social_studies', label: 'الدراسات الاجتماعية' },
];

export const SUBJECT_VALUES = SUBJECTS.map(s => s.value);

export const getSubjectLabel = (value: string) => {
    return SUBJECTS.find(s => s.value === value)?.label || 'غير مصنف';
};
