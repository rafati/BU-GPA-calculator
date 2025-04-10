'use client';

// This file contains build information
// The build number gets updated automatically during the build process

interface BuildInfo {
  buildNumber: string;
  buildDate: string;
  commitHash?: string;
}

// Default values that will be replaced during build
export const buildInfo: BuildInfo = {
  buildNumber: typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_BUILD_NUMBER || '0.1.1') 
    : (process.env.BUILD_NUMBER || '0.1.1'),
  buildDate: typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString())
    : (process.env.BUILD_DATE || new Date().toISOString()),
  commitHash: typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_COMMIT_HASH
    : process.env.COMMIT_HASH
};

export default buildInfo; 