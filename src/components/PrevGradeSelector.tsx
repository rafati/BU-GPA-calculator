import React from 'react';

// Re-define GradeScaleRow interface or import if shared
interface GradeScaleRow {
    Grade: string;
    Point: number;
    Note: string;
    AffectsGPA: boolean;
}

interface PrevGradeSelectorProps {
    value: string | null;
    onChange: (value: string | null) => void;
    gradeScale: GradeScaleRow[];
    disabled?: boolean;
    id?: string;
    className?: string;
}

const PrevGradeSelector: React.FC<PrevGradeSelectorProps> = ({
    value,
    onChange,
    gradeScale,
    disabled = false,
    id,
    className = ""
}) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = event.target.value;
        onChange(selectedValue === "" ? null : selectedValue);
    };

    // Filter grade scale to only include grades that could logically be a previous grade?
    // For now, we'll show all grades, but could filter out 'IP', 'W', 'E' etc. if needed.
    const validPrevGrades = gradeScale; // .filter(gs => !['IP', 'W', 'E'].includes(gs.Grade));

    return (
        <select
            id={id}
            value={value ?? ''}
            onChange={handleChange}
            disabled={disabled}
            required // Make required as per logic if repeat is checked
            // Basic Tailwind styling
            className={`p-1 border rounded focus:ring-bu-blue focus:border-bu-blue text-sm ${className}`}
        >
            {/* Changed placeholder */}
            <option value="">-- Select Prev. --</option>
            {validPrevGrades.map((gs) => (
                <option key={`prev-grade-${gs.Grade}`} value={gs.Grade}>
                    {/* Display Grade ONLY */}
                    {gs.Grade}
                </option>
            ))}
        </select>
    );
};

export default PrevGradeSelector; 