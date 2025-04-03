import React from 'react';

interface GpaDisplayProps {
  label: string;
  value: string | number | undefined | null;
  valueClassName?: string; // Optional class for the value part
  labelClassName?: string; // Optional class for the label part
  containerClassName?: string; // Optional class for the container div
}

const GpaDisplay: React.FC<GpaDisplayProps> = ({
  label,
  value,
  valueClassName = "font-medium", // Default styling for value
  labelClassName = "",
  containerClassName = "text-gray-900" // Default styling for container
}) => {
  return (
    <div className={containerClassName}>
      <span className={labelClassName}>{label}: </span>
      <span className={valueClassName}>{value ?? 'N/A'}</span>
    </div>
  );
};

export default GpaDisplay; 