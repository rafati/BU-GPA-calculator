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
interface EventData {
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

// Parse user agent
export function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
    deviceType: device.type || 'desktop',
    os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
  };
}

// Track event
export async function trackEvent({
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
    console.error('Failed to track event:', error);
    // Just log the error but don't fail the application
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