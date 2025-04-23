import { NextRequest, NextResponse } from 'next/server';
import { trackEvent, EventType, parseUserAgent } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    // Log the raw request
    console.log('Login tracking API received request');
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const body = await req.json();
    console.log('Login tracking request body:', body);
    
    let { sessionId, browser, deviceType, os, ipAddress, referrer, originalUserAgent } = body;
    
    // Get user agent from request header if available, or use the provided original
    const userAgent = req.headers.get('user-agent') || originalUserAgent || '';
    
    // Parse the user agent string for browser/OS information
    if (userAgent) {
      console.log('Processing UA string:', userAgent);
      const parsedUA = parseUserAgent(userAgent);
      
      // Always prefer server-parsed values
      browser = parsedUA.browser;
      deviceType = parsedUA.deviceType;
      os = parsedUA.os;
      
      console.log('Parsed UA data for LOGIN event:', parsedUA);
    } else {
      console.warn('No user agent available for parsing');
    }
    
    // Ensure all fields have values
    browser = browser || 'Unknown Browser';
    deviceType = deviceType || 'desktop';
    os = os || 'Unknown OS';
    
    console.log('Final login event data:', {
      sessionId,
      browser,
      deviceType,
      os,
      ipAddress,
      referrer
    });
    
    // Track the login event
    const result = await trackEvent({
      sessionId,
      eventType: EventType.LOGIN,
      userEmail: null, // Will be updated later in the signIn event
      browser,
      deviceType,
      os,
      ipAddress,
      referrer,
    });
    
    console.log('Login tracking API executed for session:', sessionId, 'Result:', result);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login tracking API error:', error);
    return NextResponse.json(
      { error: 'Failed to track login event' },
      { status: 500 }
    );
  }
} 