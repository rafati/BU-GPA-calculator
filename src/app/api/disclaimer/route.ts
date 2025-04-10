// src/app/api/disclaimer/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// --- Helper: Get Authenticated Sheets Client ---
// TODO: Move this to a shared utils file (e.g., src/lib/sheetsClient.ts)
// to avoid duplication across API routes.
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
    const authClient = await auth.getClient();
    return google.sheets({ 
        version: 'v4', 
        auth: authClient as any 
    });
}
// --- End Helper ---


export async function GET(request: Request) {
    // Environment Variable Check
    if (!process.env.GOOGLE_SHEET_ID) {
        console.error("Missing GOOGLE_SHEET_ID environment variable");
        return NextResponse.json({ error: "Server configuration error: Missing Sheet ID" }, { status: 500 });
    }
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // --- Define the sheet name and range for the disclaimer ---
    const sheetName = 'Configuration'; // Or AppSettings, whatever you named it
    const range = `${sheetName}!B1`;    // Cell B1 contains the regular disclaimer text 
    // ---------------------------------------------------------

    try {
        const sheets = await getSheetsClient();
        console.log(`Fetching disclaimer from Sheet ID: ${spreadsheetId}, Range: ${range}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        let disclaimerText = "Disclaimer text not found in configured sheet/cell."; // Default message

        if (rows && rows.length > 0 && rows[0].length > 0) {
            disclaimerText = rows[0][0]; // Get text from the first cell of the first row
            console.log("Successfully fetched disclaimer text.");
        } else {
            console.warn(`No data found for disclaimer in sheet '${sheetName}' at range '${range}'.`);
        }

        // Return the text
        return NextResponse.json({ disclaimer: disclaimerText });

    } catch (error: any) {
        console.error("Error fetching disclaimer:", error.message || error);
        // Provide more specific error messages if possible
        let errorMessage = 'Failed to fetch disclaimer text';
        if (error.message && error.message.includes('Requested entity was not found')) {
            errorMessage = `Google Sheet or tab not found. Check Sheet ID and tab name ('${sheetName}').`;
        } else if (error.message && error.message.includes('PERMISSION_DENIED')) {
             errorMessage = `Permission denied. Ensure the Service Account email has 'Viewer' access to the Google Sheet ('${sheetName}' tab).`;
        }
         // Return error as JSON
        return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
    }
}