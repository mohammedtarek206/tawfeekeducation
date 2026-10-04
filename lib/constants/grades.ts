/**
 * CENTRAL GRADE SYSTEM — Single Source of Truth
 * All grade values, labels, and helpers are defined here.
 * Import this everywhere instead of using hardcoded strings.
 *
 * DISABLED GRADES (kept in DB for backward compat, hidden from UI):
 *   - third_preparatory
 *   - second_secondary_baccalaureate
 */

export const GRADES = [
    { value: 'first_secondary', label: 'الصف الأول الثانوي', short: '١ ثانوي' },
    { value: 'second_secondary', label: 'الصف الثاني الثانوي', short: '٢ ثانوي' },
    { value: 'third_secondary', label: 'الصف الثالث الثانوي', short: '٣ ثانوي' },
] as const;

export type GradeValue = typeof GRADES[number]['value'];

export const GRADE_VALUES = GRADES.map(g => g.value);

/**
 * Active grades shown in all Admin/Student dropdowns & registration.
 * third_preparatory and second_secondary_baccalaureate are DISABLED.
 */
export const ACTIVE_GRADES = [
    { value: 'first_secondary', label: 'الصف الأول الثانوي', short: '١ ثانوي' },
    { value: 'second_secondary', label: 'الصف الثاني الثانوي', short: '٢ ثانوي' },
    { value: 'third_secondary', label: 'الصف الثالث الثانوي', short: '٣ ثانوي' },
];

/**
 * All grade values accepted in DB enums (includes legacy/disabled grades
 * so existing data is not broken).
 */
export const ALL_GRADE_VALUES: string[] = [
    'first_secondary',
    'second_secondary',
    'third_secondary',
    // Legacy — disabled in UI, kept for DB backward compatibility:
    'third_preparatory',
    'second_secondary_baccalaureate',
    '',
];

/** Human-readable label for a grade value */
export function gradeLabel(value: string): string {
    const map: Record<string, string> = {
        first_secondary: 'الصف الأول الثانوي',
        second_secondary: 'الصف الثاني الثانوي',
        third_secondary: 'الصف الثالث الثانوي',
        // Legacy labels
        third_preparatory: 'الصف الثالث الإعدادي (معطّل)',
        second_secondary_baccalaureate: 'الصف الثاني الثانوي – البكالوريا (معطّل)',
    };
    return map[value] || value;
}

/** Short label (for tables/badges) */
export function gradeShort(value: string): string {
    const map: Record<string, string> = {
        first_secondary: '١ ثانوي',
        second_secondary: '٢ ثانوي',
        third_secondary: '٣ ثانوي',
        third_preparatory: '٣ إعدادي',
        second_secondary_baccalaureate: '٢ بكالوريا',
    };
    return map[value] || value;
}

