/**
 * Shared GradeSelect component — used in ALL admin forms
 * Renders a consistent <select> with all active grades.
 */
import React from 'react';
import { ACTIVE_GRADES } from '@/lib/constants/grades';

interface GradeSelectProps {
    value: string;
    onChange: (value: string) => void;
    includeAll?: boolean;   // shows "كل الصفوف" as first option
    className?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function GradeSelect({
    value,
    onChange,
    includeAll = false,
    className = 'input-field',
    id,
    required,
    disabled,
}: GradeSelectProps) {
    return (
        <select
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            className={className}
            required={required}
            disabled={disabled}
        >
            {includeAll && <option value="">كل الصفوف</option>}
            {!includeAll && <option value="">اختر الصف الدراسي</option>}
            {ACTIVE_GRADES.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
            ))}
        </select>
    );
}
