import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { trackEvent, EventType } from "@/lib/analytics";
import type { User, Account, Profile } from "next-auth";
import { query } from "@/lib/db";
import { google } from 'googleapis';

// Determine the correct NEXTAUTH_URL based on the environment
const nextAuthUrl = process.env.NODE_ENV === 'production' 
  ? process.env.NEXTAUTH_URL_PROD 
  : process.env.NEXTAUTH_URL;

// Helper function to update login event in Google Sheets
async function updateLoginInSheets(userEmail: string) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable");
    }

    // Use the dedicated analytics sheet ID if available, otherwise fall back to the main sheet ID
    const analyticsSheetId = process.env.GOOGLE_ANALYTICS_SHEET_ID || process.env.GOOGLE_SHEET_ID;
    
    if (!analyticsSheetId) {
      throw new Error("Missing GOOGLE_ANALYTICS_SHEET_ID and GOOGLE_SHEET_ID environment variables");
    }

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

    // Get the most recent login event for this session
    // First, read the recent events to find a login without an email
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: analyticsSheetId,
      range: 'Events!A:K',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found in Events sheet.");
      return;
    }

    // Find the most recent LOGIN event without an email (or with an empty email)
    // Starting from the end of the sheet (most recent events first)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (row[2] === 'LOGIN' && (!row[3] || row[3] === '')) {
        // This is a login event without an email, update it
        const range = `Events!D${i+1}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: analyticsSheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[userEmail]]
          }
        });
        console.log(`Updated login record with email for: ${userEmail} in Google Sheets`);
        return;
      }
    }

    console.log("No recent login events found without an email.");
  } catch (error) {
    console.error('Failed to update login in Google Sheets:', error);
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          response_type: "code",
          hd: "bethlehem.edu", // Enforces BU domain
          prompt: "select_account", // Add this to force account selection
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }: { 
      user: User; 
      account: Account | null; 
      profile?: Profile; 
    }) {
      // Track login event will be handled in the middleware
      console.log("User signed in:", user.email);
      return true;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      return session;
    },
    async jwt({ token, user, account }: { token: JWT; user?: any; account?: any }) {
      if (user) {
        token.user = user;
      }
      return token;
    }
  },
  pages: {
    signOut: '/',  // Redirect to home page after signout
    error: '/auth/error', // Error code passed in query string as ?error=
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // Events to handle auth lifecycle
  events: {
    async signIn({ user }: { user: User }) {
      // Update the login event with the user's email
      try {
        if (user.email) {
          const useMySQL = process.env.USE_MYSQL_ANALYTICS === 'true';
          
          if (useMySQL) {
            // Use MySQL to update the login record
            console.log("Using MySQL to update login record");
            await query(
              `UPDATE events 
               SET user_email = ? 
               WHERE event_type = 'LOGIN' 
               AND (user_email IS NULL OR user_email = '')
               ORDER BY id DESC 
               LIMIT 1`,
              [user.email]
            );
            console.log("Updated login record with email for:", user.email);
          } else {
            // Use Google Sheets to update the login record
            console.log("Using Google Sheets to update login record");
            await updateLoginInSheets(user.email);
          }
        }
      } catch (error) {
        console.error("Error updating login record:", error);
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };