'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ClientWrapperProps {
  children: React.ReactNode;
}

function SearchParamsWrapper({ children }: ClientWrapperProps) {
  const searchParams = useSearchParams();
  return children;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper>
        {children}
      </SearchParamsWrapper>
    </Suspense>
  );
} 