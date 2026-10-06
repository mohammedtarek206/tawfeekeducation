/**
 * CENTRAL GRADE SYSTEM — Single Source of Truth
 * All grade values, labels, slugs, and helpers are defined here.
 * Import this everywhere instead of using hardcoded strings.
 *
 * ACTIVE GRADES (3 only):
 *   1. third_preparatory (الصف الثالث الإعدادي)
 *   2. first_secondary (الصف الأول الثانوي)
 *   3. second_secondary / second_secondary_baccalaureate (الصف الثاني البكالوريا)
 *
 * ARCHIVED / DISABLED GRADES (kept in DB for backward compat, hidden from UI):
 *   - third_secondary (الصف الثالث الثانوي - مؤرشف)
 */

export const ACTIVE_GRADES = [
    { value: 'third_preparatory', label: 'الصف الثالث الإعدادي', short: '٣ إعدادي', slug: 'third-prep' },
    { value: 'first_secondary', label: 'الصف الأول الثانوي', short: '١ ثانوي', slug: 'first-secondary' },
    { value: 'second_secondary', label: 'الصف الثاني البكالوريا', short: '٢ بكالوريا', slug: 'second-baccalaureate' },
] as const;

export const GRADES = ACTIVE_GRADES;

export type ActiveGradeValue = typeof ACTIVE_GRADES[number]['value'];
export type GradeValue = ActiveGradeValue | 'third_secondary' | 'second_secondary_baccalaureate';

export const GRADE_VALUES = ACTIVE_GRADES.map(g => g.value);

/**
 * Values accepted for NEW registrations and content creation.
 * 3 active grades only — no legacy aliases here.
 */
export const ACTIVE_GRADE_VALUES = [
    'third_preparatory',
    'first_secondary',
    'second_secondary',
];

/**
 * All grade values accepted in DB enums (includes archived/legacy grades
 * so existing historical data is preserved).
 */
export const ALL_GRADE_VALUES: string[] = [
    'third_preparatory',
    'first_secondary',
    'second_secondary',
    'third_secondary',
    'second_secondary_baccalaureate',
    '',
];

/** Check if a grade is active for content creation and registration */
export function isGradeActive(value?: string | null): boolean {
    if (!value) return false;
    return (ACTIVE_GRADE_VALUES as string[]).includes(value);
}

/** Human-readable label for a grade value */
export function gradeLabel(value?: string | null): string {
    if (!value) return '';
    const map: Record<string, string> = {
        third_preparatory: 'الصف الثالث الإعدادي',
        first_secondary: 'الصف الأول الثانوي',
        second_secondary: 'الصف الثاني البكالوريا',
        second_secondary_baccalaureate: 'الصف الثاني البكالوريا',
        third_secondary: 'الصف الثالث الثانوي (مؤرشف)',
    };
    return map[value] || value;
}

/** Short label (for tables/badges) */
export function gradeShort(value?: string | null): string {
    if (!value) return '';
    const map: Record<string, string> = {
        third_preparatory: '٣ إعدادي',
        first_secondary: '١ ثانوي',
        second_secondary: '٢ بكالوريا',
        second_secondary_baccalaureate: '٢ بكالوريا',
        third_secondary: '٣ ثانوي (مؤرشف)',
    };
    return map[value] || value;
}

/** Slug to grade value converter */
export function gradeFromSlug(slug: string): string | null {
    const slugMap: Record<string, string> = {
        'third-prep': 'third_preparatory',
        'third_preparatory': 'third_preparatory',
        'first-secondary': 'first_secondary',
        'first_secondary': 'first_secondary',
        'second-baccalaureate': 'second_secondary',
        'second-secondary': 'second_secondary',
        'second_secondary': 'second_secondary',
        'second_secondary_baccalaureate': 'second_secondary',
    };
    return slugMap[slug] || null;
}

/** Grade value to URL slug converter */
export function gradeToSlug(value: string): string {
    const map: Record<string, string> = {
        third_preparatory: 'third-prep',
        first_secondary: 'first-secondary',
        second_secondary: 'second-baccalaureate',
        second_secondary_baccalaureate: 'second-baccalaureate',
        third_secondary: 'third-secondary',
    };
    return map[value] || value;
}


