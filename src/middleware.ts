import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { parseUserAgent } from '@/lib/analytics';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
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

  // Check if this is a sign-in callback from NextAuth
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/auth/callback/google')) {
    try {
      // Get or create session ID
      const sessionId = request.cookies.get('sessionId')?.value || 
                       `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Set session cookie if not exists
      if (!request.cookies.has('sessionId')) {
        response.cookies.set('sessionId', sessionId, { 
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }
      
      // Parse user agent
      const userAgent = request.headers.get('user-agent') || '';
      const { browser, deviceType, os } = parseUserAgent(userAgent);
      
      // Get IP and referrer
      const ipAddress = request.headers.get('x-forwarded-for') || 
                        request.ip || 
                        '::1';
      const referrer = request.headers.get('referer') || null;
      
      // Track login event by calling the API route instead of direct database access
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/login-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          browser,
          deviceType,
          os,
          ipAddress,
          referrer
        }),
      }).catch(error => {
        console.error('Error calling login tracking API:', error);
      });
      
      console.log('Login tracking middleware requested for session:', sessionId);
    } catch (error) {
      console.error('Error in login tracking middleware:', error);
    }
  }
  
  return response;
}

// Apply middleware only to relevant paths
export const config = {
  matcher: [
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/callback/:path*',
  ],
}; 