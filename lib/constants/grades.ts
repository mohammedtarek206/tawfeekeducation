/**
 * CENTRAL GRADE SYSTEM — Single Source of Truth
 * All grade values, labels, and helpers are defined here.
 * Import this everywhere instead of using hardcoded strings.
 */

export const GRADES = [
    { value: 'third_preparatory', label: 'الصف الثالث الإعدادي', short: '٣ إعدادي' },
    { value: 'first_secondary', label: 'الصف الأول الثانوي', short: '١ ثانوي' },
    { value: 'second_secondary', label: 'الصف الثاني الثانوي / البكالوريا', short: '٢ ثانوي' },
    { value: 'second_secondary_baccalaureate', label: 'الصف الثاني الثانوي – البكالوريا', short: '٢ بكالوريا' },
    { value: 'third_secondary', label: 'الصف الثالث الثانوي', short: '٣ ثانوي' },
] as const;

export type GradeValue = typeof GRADES[number]['value'];

export const GRADE_VALUES = GRADES.map(g => g.value);

/** Canonical grades shown in all Admin/Student dropdowns */
export const ACTIVE_GRADES = [
    { value: 'third_preparatory', label: 'الصف الثالث الإعدادي', short: '٣ إعدادي' },
    { value: 'first_secondary', label: 'الصف الأول الثانوي', short: '١ ثانوي' },
    { value: 'second_secondary_baccalaureate', label: 'الصف الثاني الثانوي – البكالوريا', short: '٢ بكالوريا' },
];

/** All grade values accepted in DB enums */
export const ALL_GRADE_VALUES: string[] = [
    'third_preparatory',
    'first_secondary',
    'second_secondary',
    'second_secondary_baccalaureate',
    'third_secondary',
    '',
];

/** Human-readable label for a grade value */
export function gradeLabel(value: string): string {
    const found = GRADES.find(g => g.value === value);
    if (found) return found.label;
    return value;
}

/** Short label (for tables/badges) */
export function gradeShort(value: string): string {
    const found = GRADES.find(g => g.value === value);
    if (found) return found.short;
    return value;
}
