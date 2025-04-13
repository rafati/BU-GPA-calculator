import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import path from 'path';
import fs from 'fs';

// Helper function to get Google Sheets client (to read config)
async function getSheetsClient() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable");
    }
    
    let credentials;
    try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    } catch (error) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON string.", error);
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON.");
    }
    
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    return google.sheets({ version: 'v4', auth });
}

// Get Gmail API client with saved refresh token
async function getGmailClient() {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
        throw new Error("Missing Gmail API credentials. Need GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN");
    }
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:3000/api/auth/callback/google' // Redirect URI (not used for refresh token flow)
    );
    
    // Set the refresh token
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    // Get Gmail API client
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Create a base64 encoded email
function createEmail(options: {
    from: string;
    to: string;
    subject: string;
    textContent: string;
    htmlContent: string;
    attachments?: Array<{
        filename: string;
        content: string; // base64 encoded content
        mimeType: string;
    }>;
}) {
    // Generate a random boundary string for MIME parts
    const boundary = `----=${Math.random().toString(36).substring(2)}`;
    
    // Create email headers
    const headers = [
        `From: ${options.from}`,
        `To: ${options.to}`,
        `Subject: ${options.subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`
    ].join('\r\n');
    
    let email = headers + '\r\n\r\n';
    
    // Add text part
    email += `--${boundary}\r\n`;
    email += 'Content-Type: text/plain; charset=utf-8\r\n\r\n';
    email += options.textContent + '\r\n\r\n';
    
    // Add HTML part
    email += `--${boundary}\r\n`;
    email += 'Content-Type: text/html; charset=utf-8\r\n\r\n';
    email += options.htmlContent + '\r\n\r\n';
    
    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
        options.attachments.forEach(attachment => {
            email += `--${boundary}\r\n`;
            email += `Content-Type: ${attachment.mimeType}\r\n`;
            email += 'Content-Transfer-Encoding: base64\r\n';
            email += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
            email += attachment.content.replace(/(.{76})/g, "$1\r\n") + '\r\n\r\n';
        });
    }
    
    // End message with boundary
    email += `--${boundary}--`;
    
    // Encode to base64 with URL-safe encoding
    return Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Save feedback to a local file as a backup
async function saveFeedbackToFile(feedback: any) {
    // Format the feedback data
    const timestamp = new Date().toISOString();
    const feedbackData = {
        timestamp,
        ...feedback
    };
    
    // Log to console
    console.log('FEEDBACK RECEIVED:', JSON.stringify(feedbackData, null, 2));
    
    try {
        // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Create/append to feedback log file
        const logFilePath = path.join(logsDir, 'feedback.json');
        let existingLogs = [];
        
        // Read existing logs if file exists
        if (fs.existsSync(logFilePath)) {
            const fileContent = fs.readFileSync(logFilePath, 'utf8');
            try {
                existingLogs = JSON.parse(fileContent);
            } catch (e) {
                console.error('Error parsing existing logs:', e);
            }
        }
        
        // Add new feedback to logs
        existingLogs.push(feedbackData);
        
        // Write back to file
        fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2), 'utf8');
        console.log(`Feedback saved to ${logFilePath}`);
        
        return true;
    } catch (error) {
        console.error('Error saving feedback to file:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    // 1. --- Get User Session ---
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userEmail = session.user.email;
    console.log(`Processing feedback from user: ${userEmail}`);
    
    // 2. --- Parse Request Body ---
    let feedbackText: string, studentId: string | null, screenshotDataUrl: string | null;
    
    try {
        const body = await request.json();
        feedbackText = body.feedbackText;
        studentId = body.studentId || null;
        screenshotDataUrl = body.screenshotDataUrl || null;
        
        if (!feedbackText || typeof feedbackText !== 'string') {
            return NextResponse.json({ error: 'Feedback text is required' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error parsing request body:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // 3. --- Environment Variable Check ---
    if (!process.env.GOOGLE_SHEET_ID) {
        console.error("Missing GOOGLE_SHEET_ID environment variable");
        return NextResponse.json({ error: "Server configuration error: Missing Sheet ID" }, { status: 500 });
    }
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // 4. --- Get Recipient Email from Config Sheet ---
    let recipientEmail: string;
    try {
        const sheets = await getSheetsClient();
        const configSheetName = 'Configuration';
        const range = `${configSheetName}!B4`;
        
        console.log(`Fetching feedback recipient email from: ${spreadsheetId}, Range: ${range}`);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        
        const values = response.data.values;
        
        if (!values || values.length === 0 || !values[0] || !values[0][0]) {
            console.error(`Feedback recipient email not found in sheet '${configSheetName}' at cell B4.`);
            return NextResponse.json({ error: `Configuration error: Feedback recipient email not found in sheet '${configSheetName}' at cell B4.` }, { status: 500 });
        }
        
        recipientEmail = values[0][0].trim();
        console.log(`Feedback recipient email: ${recipientEmail}`);
        
        // Validate that the recipient email is actually an email address
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            console.error(`Invalid recipient email format: ${recipientEmail}`);
            
            // Try to use fallback email from environment variables
            const fallbackEmail = process.env.FEEDBACK_RECIPIENT_EMAIL;
            if (fallbackEmail && emailRegex.test(fallbackEmail)) {
                console.log(`Using fallback email from environment: ${fallbackEmail}`);
                recipientEmail = fallbackEmail;
            } else {
                return NextResponse.json({ error: `Configuration error: Invalid recipient email format in sheet '${configSheetName}' at cell B4 and no valid fallback email in environment variables.` }, { status: 500 });
            }
        }
    } catch (error: any) {
        console.error('Error fetching feedback recipient email:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to fetch feedback recipient email';
        return NextResponse.json({ error: `Config Error: ${errorMessage}` }, { status: 500 });
    }
    
    // 5. --- Prepare Email Content ---
    const timestamp = new Date().toISOString();
    const emailSubject = `GPA Calculator Feedback - ${timestamp}`;
    
    let emailHtml = `
        <h2>GPA Calculator Feedback</h2>
        <p><strong>From User:</strong> ${userEmail}</p>
        ${studentId ? `<p><strong>Student ID:</strong> ${studentId}</p>` : ''}
        <p><strong>Timestamp:</strong> ${timestamp}</p>
        <h3>Feedback:</h3>
        <p>${feedbackText.replace(/\n/g, '<br>')}</p>
    `;
    
    let emailText = `
        GPA Calculator Feedback
        ----------------------
        From User: ${userEmail}
        ${studentId ? `Student ID: ${studentId}` : ''}
        Timestamp: ${timestamp}
        
        Feedback:
        ${feedbackText}
    `.trim();
    
    // Create feedback data object for backup
    const feedbackData = {
        userEmail,
        studentId,
        timestamp,
        feedbackText,
        recipientEmail,
        hasScreenshot: !!screenshotDataUrl
    };
    
    // Save to file as backup before attempting email
    await saveFeedbackToFile({
        ...feedbackData,
        screenshot: screenshotDataUrl ? '[Screenshot data included but not shown here]' : null
    });
    
    // 6. --- Send Email via Gmail API or fallback ---
    try {
        // Check if we have Gmail API credentials
        const useGmailAPI = !!(process.env.GMAIL_CLIENT_ID && 
                              process.env.GMAIL_CLIENT_SECRET && 
                              process.env.GMAIL_REFRESH_TOKEN);
        
        if (useGmailAPI) {
            // Try sending the email via Gmail API
            try {
                const gmail = await getGmailClient();
                
                // Prepare email content and attachments
                const emailOptions: any = {
                    from: process.env.GMAIL_SENDER_EMAIL || 'registrarservice@bethlehem.edu',
                    to: recipientEmail,
                    subject: emailSubject,
                    textContent: emailText,
                    htmlContent: emailHtml,
                    attachments: []
                };
                
                console.log('Email options:', JSON.stringify({
                    from: emailOptions.from,
                    to: emailOptions.to,
                    subject: emailOptions.subject
                }));
                
                // Add screenshot attachment if provided
                if (screenshotDataUrl) {
                    const base64Data = screenshotDataUrl.replace(/^data:image\/png;base64,/, '');
                    
                    emailOptions.attachments = [
                        {
                            filename: `feedback-screenshot-${timestamp}.png`,
                            content: base64Data,
                            mimeType: 'image/png'
                        }
                    ];
                }
                
                // Encode the email in base64
                const encodedEmail = createEmail(emailOptions);
                
                // Send email using Gmail API
                const response = await gmail.users.messages.send({
                    userId: 'me', // 'me' refers to the authenticated user
                    requestBody: {
                        raw: encodedEmail
                    }
                });
                
                console.log(`Feedback email sent successfully to ${recipientEmail}`, response.data);
                
                return NextResponse.json({ 
                    success: true, 
                    message: 'Feedback submitted successfully!' 
                });
            } catch (emailError: any) {
                // Log the email error but fall back to file-only storage
                console.error('Error sending email via Gmail API:', emailError);
                
                // Return success but note that email wasn't sent
                return NextResponse.json({ 
                    success: true, 
                    message: 'Feedback submitted successfully, but email delivery failed. Your feedback has been saved.' 
                });
            }
        } else {
            // Just use the file storage as a fallback
            console.log('Gmail API credentials not configured, using file storage only');
            
            return NextResponse.json({ 
                success: true, 
                message: 'Feedback submitted successfully! (Email delivery is not configured, but your feedback has been recorded.)'
            });
        }
    } catch (error: any) {
        console.error('Error processing feedback:', error);
        return NextResponse.json({ 
            error: `Error processing feedback: ${error.message}`,
            message: 'Failed to process feedback, please try again later.'
        }, { status: 500 });
    }
} 