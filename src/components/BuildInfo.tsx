'use client';

import { useEffect, useState } from 'react';
import buildInfo from '@/lib/buildInfo';

interface BuildInfoProps {
  className?: string;
}

export default function BuildInfo({ className = '' }: BuildInfoProps) {
  // To prevent hydration errors, start with empty values and populate on client only
  const [isClient, setIsClient] = useState(false);
  const [buildNumber, setBuildNumber] = useState('');
  const [buildDate, setBuildDate] = useState('');
  
  useEffect(() => {
    // We're on the client once this effect runs
    setIsClient(true);
    setBuildNumber(buildInfo.buildNumber);
    
    // Format the date in a more readable format if needed
    if (buildInfo.buildDate) {
      try {
        const date = new Date(buildInfo.buildDate);
        if (!isNaN(date.getTime())) {
          setBuildDate(date.toLocaleDateString());
        } else {
          setBuildDate(buildInfo.buildDate);
        }
      } catch (e) {
        // Keep the original date if parsing fails
        setBuildDate(buildInfo.buildDate);
      }
    }
  }, []);

  // Only render the actual content client-side to prevent hydration errors
  if (!isClient) {
    return <div className={`text-xs text-gray-500 ${className}`}></div>;
  }

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <span>Version {buildNumber}</span>
      {buildDate && (
        <span className="ml-2">({buildDate})</span>
      )}
    </div>
  );
} 