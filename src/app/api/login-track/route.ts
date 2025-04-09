import { NextRequest, NextResponse } from 'next/server';
import { trackEvent, EventType } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, browser, deviceType, os, ipAddress, referrer } = body;
    
    // Track the login event
    await trackEvent({
      sessionId,
      eventType: EventType.LOGIN,
      userEmail: null, // Will be updated later in the signIn event
      browser,
      deviceType,
      os,
      ipAddress,
      referrer,
    });
    
    console.log('Login tracking API executed for session:', sessionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login tracking API error:', error);
    return NextResponse.json(
      { error: 'Failed to track login event' },
      { status: 500 }
    );
  }
} 