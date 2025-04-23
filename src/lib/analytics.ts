import { query } from './db';
import { UAParser } from 'ua-parser-js';

// Define event types
export const EventType = {
  LOGIN: 'LOGIN',
  STUDENT_LOAD: 'STUDENT_LOAD',
  SHARE: 'SHARE',
  PDF_DOWNLOAD: 'PDF_DOWNLOAD'
  // Removed to avoid SQL truncation errors:
  // GPA_TAB_CHANGE: 'GPA_TAB_CHANGE',
  // GPA_EXPLANATION_VIEW: 'GPA_EXPLANATION_VIEW'
} as const;

export type EventType = typeof EventType[keyof typeof EventType];

// Define event data interface
export interface EventData {
  sessionId: string;
  eventType: EventType;
  userEmail?: string | null;
  studentId?: string | null;
  browser?: string | null;
  deviceType?: string | null;
  os?: string | null;
  ipAddress?: string | null;
  referrer?: string | null;
  additionalData?: Record<string, any> | null;
}

// Parse user agent with improved detection
export function parseUserAgent(userAgent: string) {
  // Handle empty or undefined user agent
  if (!userAgent || userAgent.trim() === '') {
    console.warn('Empty user agent string provided to parseUserAgent');
    return {
      browser: 'Unknown Browser',
      deviceType: 'desktop',
      os: 'Unknown OS'
    };
  }

  console.log('Parsing user agent:', userAgent);
  
  // Initialize parser with complete UA string
  const parser = new UAParser(userAgent);
  
  // Get browser information
  const browserInfo = parser.getBrowser();
  const browserName = browserInfo.name || 'Unknown';
  const browserVersion = browserInfo.version || '';
  let browser = browserName !== 'Unknown' ? 
    `${browserName} ${browserVersion}`.trim() : 
    detectBrowserFromUA(userAgent);
  
  // Get OS information
  const osInfo = parser.getOS();
  const osName = osInfo.name || 'Unknown';
  const osVersion = osInfo.version || '';
  let os = osName !== 'Unknown' ? 
    `${osName} ${osVersion}`.trim() : 
    detectOSFromUA(userAgent);
  
  // Get device information
  const deviceInfo = parser.getDevice();
  let deviceType = deviceInfo.type || detectDeviceTypeFromUA(userAgent);
  
  // If deviceType is still not detected, make a best guess based on UA
  if (!deviceType) {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      deviceType = 'mobile';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }
  }
  
  // Ensure we always have values for all fields
  browser = browser || 'Unknown Browser';
  os = os || 'Unknown OS';
  deviceType = deviceType || 'desktop';
  
  console.log('UA Parser results:', { 
    browserInfo, 
    osInfo, 
    deviceInfo,
    finalResult: { browser, os, deviceType }
  });
  
  return { browser, deviceType, os };
}

// Helper function to detect browser when UAParser fails
function detectBrowserFromUA(ua: string): string {
  ua = ua.toLowerCase();
  
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  if (ua.includes('msie') || ua.includes('trident/')) return 'Internet Explorer';
  
  return 'Unknown Browser';
}

// Helper function to detect OS when UAParser fails
function detectOSFromUA(ua: string): string {
  ua = ua.toLowerCase();
  
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'MacOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  
  return 'Unknown OS';
}

// Helper function to detect device type when UAParser fails
function detectDeviceTypeFromUA(ua: string): string {
  ua = ua.toLowerCase();
  
  if (ua.includes('iphone') || ua.includes('android') && !ua.includes('tablet') && !ua.includes('ipad')) {
    return 'mobile';
  }
  
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'tablet';
  }
  
  return 'desktop';
}

// Track event in MySQL database
async function trackEventInMySql({
  sessionId,
  eventType,
  userEmail = null,
  studentId = null,
  browser = null,
  deviceType = null,
  os = null,
  ipAddress = null,
  referrer = null,
  additionalData = null,
}: EventData) {
  try {
    const result = await query(
      `
      INSERT INTO events (
        session_id, 
        event_type, 
        user_email, 
        student_id, 
        browser, 
        device_type, 
        os, 
        ip_address, 
        referrer, 
        additional_data
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sessionId,
        eventType,
        userEmail,
        studentId,
        browser,
        deviceType,
        os,
        ipAddress,
        referrer,
        additionalData ? JSON.stringify(additionalData) : null,
      ]
    );
    return result;
  } catch (error) {
    console.error('Failed to track event in MySQL:', error);
    // Just log the error but don't fail the application
    return null;
  }
}

// Get the base URL for API requests, handling both client and server environments
function getBaseUrl() {
  // In the browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // In server-side code, use the environment variable or a default
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Check for Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback for development
  return 'http://localhost:3000';
}

// Track event via API (will handle either MySQL or Google Sheets server-side)
async function trackEventViaApi(eventData: EventData) {
  try {
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/analytics`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`Analytics tracking failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error tracking event via API:', error);
    return null;
  }
}

// Track event using the appropriate method based on environment configuration
export async function trackEvent(eventData: EventData) {
  try {
    return trackEventViaApi(eventData);
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return null;
  }
}

// Middleware helper to track events from API routes
export function createTrackingMiddleware() {
  return async (req: any, res: any, next?: () => void) => {
    // Generate session ID if not exists
    const sessionId = req.cookies?.sessionId || 
                     `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    if (!req.cookies?.sessionId) {
      // Set session cookie if not exists
      res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict`);
    }
    
    // Get user agent and IP
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     'unknown';
    const referrer = req.headers.referer || null;
    
    // Parse user agent
    const { browser, deviceType, os } = parseUserAgent(userAgent);
    
    // Attach tracking function to request
    req.trackEvent = async (eventType: EventType, options: Partial<EventData> = {}) => {
      // Validate event type before sending to avoid DB errors
      if (!Object.values(EventType).includes(eventType)) {
        console.warn(`Event type "${eventType}" is not supported in the database schema. Skipping tracking.`);
        return null;
      }
      
      return trackEvent({
        sessionId,
        eventType,
        browser,
        deviceType,
        os,
        ipAddress,
        referrer,
        ...options,
      });
    };
    
    if (next) {
      next();
    }
  };
} 