'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Clear browser storage
      sessionStorage.clear();
      localStorage.removeItem('next-auth.session-token');
      localStorage.removeItem('next-auth.callback-url');
      localStorage.removeItem('next-auth.csrf-token');
      
      // Sign out using NextAuth
      await signOut({
        callbackUrl: '/',
        redirect: true,
      });
      
      // Additional redirect as a fallback
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force a hard refresh as last resort
      window.location.href = '/';
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="px-4 py-1 text-sm text-gray-700 hover:text-red-600 rounded disabled:opacity-50"
    >
      {isSigningOut ? 'Signing Out...' : 'Sign Out'}
    </button>
  );
} 