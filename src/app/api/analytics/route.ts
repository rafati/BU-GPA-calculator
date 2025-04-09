import { NextRequest, NextResponse } from 'next/server';
import { trackEvent, EventType, parseUserAgent } from '@/lib/analytics';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { eventType, studentId, additionalData } = body;
    
    // Validate event type to prevent database errors
    if (!Object.values(EventType).includes(eventType as any)) {
      console.warn(`Event type "${eventType}" is not supported in the database schema. Request rejected.`);
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }
    
    // Get client info
    const userAgent = req.headers.get('user-agent') || '';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.ip || 
                     'unknown';
    const referrer = req.headers.get('referer') || null;
    
    // Generate session ID from cookies or create new one
    const cookieStore = req.cookies;
    const sessionId = cookieStore.get('sessionId')?.value || 
                     `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Parse user agent
    const { browser, deviceType, os } = parseUserAgent(userAgent);
    
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Set session cookie if not exists
    if (!cookieStore.has('sessionId')) {
      response.cookies.set({
        name: 'sessionId',
        value: sessionId,
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
      });
    }
    
    // Track the event
    await trackEvent({
      sessionId,
      eventType: eventType as EventType,
      userEmail: session?.user?.email || null,
      studentId: studentId || null,
      browser,
      deviceType,
      os,
      ipAddress,
      referrer,
      additionalData,
    });
    
    return response;
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
} 