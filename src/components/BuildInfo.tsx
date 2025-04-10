'use client';

import { useEffect, useState } from 'react';
import buildInfo from '@/lib/buildInfo';

interface BuildInfoProps {
  className?: string;
}

export default function BuildInfo({ className = '' }: BuildInfoProps) {
  const [buildNumber, setBuildNumber] = useState(buildInfo.buildNumber);
  const [buildDate, setBuildDate] = useState(buildInfo.buildDate);
  
  useEffect(() => {
    // Format the date in a more readable format if needed
    if (buildDate) {
      try {
        const date = new Date(buildDate);
        if (!isNaN(date.getTime())) {
          setBuildDate(date.toLocaleDateString());
        }
      } catch (e) {
        // Keep the original date if parsing fails
      }
    }
  }, [buildDate]);

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <span>Version {buildNumber}</span>
      {buildDate && (
        <span className="ml-2">({buildDate})</span>
      )}
    </div>
  );
} 