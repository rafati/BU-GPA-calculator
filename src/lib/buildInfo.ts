'use client';

// This file contains build information
// The build number gets updated automatically during the build process

interface BuildInfo {
  buildNumber: string;
  buildDate: string;
  commitHash?: string;
}

/**
 * To avoid React hydration errors, we need to be careful to use the same value
 * during server and client rendering. We'll prioritize the NEXT_PUBLIC_ variables.
 */
export const buildInfo: BuildInfo = {
  // Use only the NEXT_PUBLIC version to avoid hydration mismatches
  buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || '0.1.5',
  
  // Use only the NEXT_PUBLIC version to avoid hydration mismatches
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
  
  // Use only the NEXT_PUBLIC version to avoid hydration mismatches
  commitHash: process.env.NEXT_PUBLIC_COMMIT_HASH
};

export default buildInfo; 