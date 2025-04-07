'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Create a separate component for the content that uses useSearchParams
function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // Log the error for debugging
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">There was a problem signing you in</h2>
      
      {error === 'AccessDenied' && (
        <p className="mb-4 text-gray-700">
          You don't have permission to sign in. Please make sure you're using your @bethlehem.edu email.
        </p>
      )}
      
      {error === 'Configuration' && (
        <p className="mb-4 text-gray-700">
          There's a problem with the server configuration. Please contact the administrator.
        </p>
      )}
      
      {error === 'Verification' && (
        <p className="mb-4 text-gray-700">
          The login link is no longer valid. It may have been used already or it may have expired.
        </p>
      )}
      
      {!error && (
        <p className="mb-4 text-gray-700">
          An unknown error occurred during authentication. Please try again.
        </p>
      )}
      
      <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
        <Link 
          href="/"
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition text-center"
        >
          Back to Home
        </Link>
        <button
          onClick={() => {
            router.push('/');
            // Clear any cached sessions or tokens
            sessionStorage.clear();
            localStorage.clear();
            // Force a hard refresh if needed
            setTimeout(() => {
              window.location.href = '/';
            }, 100);
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-center"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Wrap with Suspense in the main component
export default function AuthError() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4 bg-gray-100">
      <img 
        src="/registrarbanner.png" 
        alt="Bethlehem University Logo" 
        className="h-16 md:h-20 object-contain mb-8"
      />
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-red-600 text-center">Authentication Error</h1>
      
      <Suspense fallback={
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full flex justify-center">
          <p className="text-gray-700">Loading error details...</p>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
} 