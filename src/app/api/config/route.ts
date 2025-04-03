import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Environment variable for the Sheet ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const CONFIG_SHEET_NAME = 'configuration'; // Sheet name containing the base URL
const BASE_URL_RANGE = `${CONFIG_SHEET_NAME}!B2`; // Cell B2

// --- Helper: Get Authenticated Sheets Client (Copied from other routes) ---
// TODO: Consider moving this to a shared utils file later
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
// --- End Helper ---

export async function GET() {
    if (!SPREADSHEET_ID) {
        console.error("GOOGLE_SHEET_ID environment variable not set.");
        return NextResponse.json({ error: "Server configuration error: Sheet ID missing." }, { status: 500 });
    }

    try {
        // Use the local helper function now
        const sheets = await getSheetsClient();

        console.log(`Fetching base URL from: ${SPREADSHEET_ID}, Range: ${BASE_URL_RANGE}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: BASE_URL_RANGE,
        });

        const values = response.data.values;

        if (!values || values.length === 0 || !values[0] || !values[0][0]) {
            console.error(`Base URL not found in sheet '${CONFIG_SHEET_NAME}' at cell B2.`);
            return NextResponse.json({ error: `Configuration error: Base URL not found in sheet '${CONFIG_SHEET_NAME}' at cell B2.` }, { status: 404 });
        }

        const baseUrl = values[0][0].trim(); // Get the value from the first row, first cell
        console.log("Base URL fetched successfully:", baseUrl);

        return NextResponse.json({ baseUrl });

    } catch (error: any) {
        console.error('Error fetching base URL from Google Sheet:', error);
        // Simplified error handling for now
        const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to fetch base URL';
        return NextResponse.json({ error: `API Error: ${errorMessage}` }, { status: 500 });
    }
} 