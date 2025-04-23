import { NextRequest, NextResponse } from 'next/server';
import { EventType, parseUserAgent, EventData } from '@/lib/analytics';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { google } from 'googleapis';

// Server-side function to track in MySQL
async function trackEventInMySql(eventData: EventData) {
  try {
    const {
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
    } = eventData;

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
    return null;
  }
}

// Server-side function to track in Google Sheets
async function trackEventInSheets(eventData: EventData) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable");
    }

    // Use the dedicated analytics sheet ID if available, otherwise fall back to the main sheet ID
    const analyticsSheetId = process.env.GOOGLE_ANALYTICS_SHEET_ID || process.env.GOOGLE_SHEET_ID;
    
    if (!analyticsSheetId) {
      throw new Error("Missing GOOGLE_ANALYTICS_SHEET_ID and GOOGLE_SHEET_ID environment variables");
    }

    const {
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
    } = eventData;

    // Debug logging to see what values we're receiving
    console.log('Tracking event in Google Sheets with data:', {
      sessionId,
      eventType,
      userEmail,
      studentId,
      browser,
      deviceType,
      os,
      ipAddress,
      referrer
    });

    // Parse credentials for Google Sheets
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    } catch (error) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON string.", error);
      throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON.");
    }

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Create Sheets client
    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare row data
    const row = [
      new Date().toISOString(), // timestamp
      sessionId,
      eventType,
      userEmail || '',
      studentId || '',
      browser || '',
      deviceType || 'desktop', // Default to desktop if not provided
      os || '',
      ipAddress || '',
      referrer || '',
      additionalData ? JSON.stringify(additionalData) : ''
    ];

    // Append to the Events sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: analyticsSheetId,
      range: 'Events!A:K', // Assuming the sheet is named 'Events' with columns A through K
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });

    console.log('Event tracked in Google Sheets:', response.data.updates);
    return response.data;
  } catch (error) {
    console.error('Failed to track event in Google Sheets:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Debug the request headers
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { eventType, studentId, additionalData, ...restOfBody } = body;
    
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
    let sessionId = cookieStore.get('sessionId')?.value;
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Parse user agent with the improved function
    const parsedUA = parseUserAgent(userAgent);
    const { browser, deviceType, os } = parsedUA;
    
    // Log what we parsed
    console.log('Parsed UA data:', parsedUA);
    
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
    
    // Prepare event data
    const eventData: EventData = {
      sessionId,
      eventType: eventType as EventType,
      userEmail: session?.user?.email || restOfBody.userEmail || null,
      studentId: studentId || null,
      browser: browser || restOfBody.browser || null,
      deviceType: deviceType || restOfBody.deviceType || 'desktop',
      os: os || restOfBody.os || null,
      ipAddress,
      referrer,
      additionalData,
    };
    
    // Log the final event data
    console.log('Final event data being stored:', eventData);
    
    try {
      // Determine which storage method to use based on environment variables
      const useMySQL = process.env.USE_MYSQL_ANALYTICS === 'true';
      
      if (useMySQL) {
        // Use MySQL for analytics tracking
        console.log('Using MySQL for analytics tracking');
        await trackEventInMySql(eventData);
      } else {
        // Use Google Sheets for analytics tracking
        console.log('Using Google Sheets for analytics tracking');
        await trackEventInSheets(eventData);
      }
    } catch (trackingError) {
      // Log the error but don't fail the request
      console.error('Error during event tracking:', trackingError);
    }
    
    return response;
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
} 