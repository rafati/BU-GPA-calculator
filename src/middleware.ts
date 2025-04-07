import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = path === '/' && request.nextUrl.search.includes('data='); // Share links
  
  // Check for authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Allow access to share links without authentication
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Handle sign-out specifically
  if (path.startsWith('/api/auth/signout')) {
    // For sign-out requests, add cache control headers to prevent caching
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  return NextResponse.next();
}

// Apply middleware only to relevant paths
export const config = {
  matcher: [
    '/api/auth/signout',
    '/api/auth/session',
  ],
}; 