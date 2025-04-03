// src/app/api/gradescale/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Function to get authenticated Sheets client
async function getSheetsClient() {
    // Ensure credentials are provided
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable");
    }

    let credentials;
    try {
        // Try parsing the credentials string directly first
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    } catch (error) {
        // If parsing fails, it's likely an issue with the env var format
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON string from environment variable.", error);
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON. Check .env.local formatting.");
    }


    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Read-only scope
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    return sheets;
}

// Define the expected structure for a grade scale row
interface GradeScaleRow {
    Grade: string;
    Point: number;
    Note: string;
    AffectsGPA: boolean; // Add our derived flag
}


export async function GET(request: Request) {
    // --- Environment Variable Checks ---
    if (!process.env.GOOGLE_SHEET_ID) {
        // Added check here for robustness
        console.error("Missing GOOGLE_SHEET_ID environment variable");
        return NextResponse.json({ error: "Server configuration error: Missing Sheet ID" }, { status: 500 });
    }
    // --- End Checks ---

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    // --- Define the sheet name and range ---
    // !!! IMPORTANT: Make sure 'Gradescale' exactly matches the name of your sheet tab !!!
    const sheetName = 'Gradescale';
    // !!! IMPORTANT: Adjust range if needed. A2:C assumes headers in row 1 !!!
    const range = `${sheetName}!A2:C`;
    // -----------------------------------------

    try {
        const sheets = await getSheetsClient();

        console.log(`Fetching data from Sheet ID: ${spreadsheetId}, Range: ${range}`); // Added logging

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            console.log(`No data found in sheet '${sheetName}' at range '${range}'.`);
            return NextResponse.json([]); // Return empty array if no data
        }

        console.log(`Found ${rows.length} rows in Gradescale sheet.`); // Added logging

        // --- Process rows based on requirements ---
        const gradeScaleData: GradeScaleRow[] = rows.map((row, index) => { // Added index for logging
            const grade = row[0] || '';    // Column A (index 0)
            const pointStr = row[1] || '0'; // Column B (index 1)
            const note = row[2] || '';     // Column C (index 2)

            // Determine if GPA affects based on Note (Requirement v20)
            const affectsGPA = !note.includes("Not Calcualted in GPA");

            // Convert point string to number, handle potential errors
            let point = parseFloat(pointStr);
            if (isNaN(point)) {
                console.warn(`Row ${index + 2}: Invalid point value "${pointStr}" for grade "${grade}". Defaulting to 0.`);
                point = 0;
            }

            return {
                Grade: grade,
                Point: point,
                Note: note,
                AffectsGPA: affectsGPA,
            };
        }).filter(item => item.Grade); // Filter out rows with no grade specified

        console.log("Successfully fetched and processed Gradescale data.");
        return NextResponse.json(gradeScaleData);

    } catch (error: any) {
        console.error("Error in /api/gradescale GET:", error.message || error);
        let errorMessage = 'Failed to fetch grade scale data';
        let statusCode = 500;

        // Check for specific Google API errors
        if (error.code === 404 || (error.message && error.message.includes('Requested entity was not found'))) {
             errorMessage = `Google Sheet or tab not found. Check Sheet ID ('${spreadsheetId}') and Tab Name ('${sheetName}').`;
             statusCode = 404;
        } else if (error.code === 403 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
             errorMessage = `Permission denied. Ensure the Service Account email has 'Viewer' access to the Google Sheet.`;
             statusCode = 403;
        } else if (error.message && (error.message.includes('invalid_grant') || error.message.includes('credentials error'))) {
             errorMessage = `Invalid grant or Service Account credentials error. Check GOOGLE_SERVICE_ACCOUNT_CREDENTIALS in .env.local.`;
             statusCode = 401;
        }

        return NextResponse.json({ error: errorMessage, details: error.message }, { status: statusCode });
    }
}