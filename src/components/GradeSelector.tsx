import React from 'react';

// Re-define GradeScaleRow interface or import it if shared
interface GradeScaleRow {
    Grade: string;
    Point: number;
    Note: string;
    AffectsGPA: boolean;
}

interface GradeSelectorProps {
    value: string | null;
    onChange: (value: string | null) => void;
    gradeScale: GradeScaleRow[];
    disabled?: boolean;
    placeholder?: string;
    id?: string;
    className?: string; // Allow passing additional Tailwind classes
}

const GradeSelector: React.FC<GradeSelectorProps> = ({
    value,
    onChange,
    gradeScale,
    disabled = false,
    placeholder = "-- Select Grade --",
    id,
    className = "" // Default to empty string
}) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = event.target.value;
        onChange(selectedValue === "" ? null : selectedValue); // Pass null if placeholder selected
    };

    return (
        <select
            id={id}
            value={value ?? ''} // Use empty string for null value to match placeholder option
            onChange={handleChange}
            disabled={disabled}
             // Basic Tailwind styling for selects
            className={`p-1 border rounded focus:ring-bu-blue focus:border-bu-blue text-sm ${className}`}
        >
            <option value="">{placeholder}</option>
            {gradeScale.map((gs) => (
                <option key={`grade-${gs.Grade}`} value={gs.Grade}>
                    {/* Display Grade ONLY */}
                    {gs.Grade}
                </option>
            ))}
        </select>
    );
};

export default GradeSelector; 