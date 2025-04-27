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
      // Get existing session ID from a server cookie if available
      // This is crucial for maintaining session consistency
      const existingSessionId = request.cookies.get('next-auth.session-token')?.value;
      
      // Use existing auth session ID if available, otherwise generate a new one
      // This provides session consistency between login and subsequent actions
      const sessionId = existingSessionId || 
                       request.cookies.get('sessionId')?.value || 
                       `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      console.log('Using session ID for tracking:', sessionId);
      
      // Set session cookie if not exists
      if (!request.cookies.has('sessionId')) {
        response.cookies.set('sessionId', sessionId, { 
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }
      
      // Parse user agent with improved detection
      const userAgent = request.headers.get('user-agent') || '';
      console.log('Full User-Agent string:', userAgent);
      
      // Manual browser and OS detection as fallback
      let manualBrowser = 'Unknown Browser';
      let manualOS = 'Unknown OS';
      let manualDeviceType = 'desktop';
      
      const ua = userAgent.toLowerCase();
      
      // Browser detection
      if (ua.includes('firefox')) manualBrowser = 'Firefox';
      else if (ua.includes('edg/')) manualBrowser = 'Edge';
      else if (ua.includes('chrome')) manualBrowser = 'Chrome';
      else if (ua.includes('safari') && !ua.includes('chrome')) manualBrowser = 'Safari';
      else if (ua.includes('opera') || ua.includes('opr/')) manualBrowser = 'Opera';
      
      // OS detection
      if (ua.includes('windows')) manualOS = 'Windows';
      else if (ua.includes('macintosh') || ua.includes('mac os x')) manualOS = 'MacOS';
      else if (ua.includes('linux')) manualOS = 'Linux';
      else if (ua.includes('android')) manualOS = 'Android';
      else if (ua.includes('iphone') || ua.includes('ipad')) manualOS = 'iOS';
      
      // Device type detection
      if (ua.includes('mobile') || (ua.includes('android') && !ua.includes('tablet'))) {
        manualDeviceType = 'mobile';
      } else if (ua.includes('ipad') || ua.includes('tablet')) {
        manualDeviceType = 'tablet';
      }
      
      // Use parseUserAgent but fallback to manual detection
      const parsedUA = parseUserAgent(userAgent);
      const browser = parsedUA.browser !== 'Unknown Browser' ? parsedUA.browser : manualBrowser;
      const os = parsedUA.os !== 'Unknown OS' ? parsedUA.os : manualOS;
      const deviceType = parsedUA.deviceType || manualDeviceType;
      
      // Debug logging
      console.log('Manual browser detection:', manualBrowser);
      console.log('Manual OS detection:', manualOS);
      console.log('Manual device type detection:', manualDeviceType);
      console.log('Parsed UA:', parsedUA);
      console.log('Final values:', { browser, os, deviceType });
      
      // Get IP and referrer
      const ipAddress = request.headers.get('x-forwarded-for') || 
                        request.ip || 
                        '::1';
      const referrer = request.headers.get('referer') || null;
      
      // Ensure we have a valid NEXTAUTH_URL for the API call
      const baseUrl = process.env.NEXTAUTH_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      // Track login event by calling the API route instead of direct database access
      try {
        const trackingResponse = await fetch(`${baseUrl}/api/login-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'User-Agent': userAgent // Pass the original user agent
        },
        body: JSON.stringify({
          sessionId,
          browser,
          deviceType,
          os,
          ipAddress,
            referrer,
            originalUserAgent: userAgent // Include the original UA string for debugging
        }),
        });
        
        if (!trackingResponse.ok) {
          console.error('Login tracking API returned error:', await trackingResponse.text());
        } else {
          console.log('Login tracking successful');
        }
      } catch (fetchError) {
        console.error('Error calling login tracking API:', fetchError);
      }
      
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