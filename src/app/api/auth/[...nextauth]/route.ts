import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { trackEvent, EventType } from "@/lib/analytics";
import type { User, Account, Profile } from "next-auth";
import { query } from "@/lib/db";

// Determine the correct NEXTAUTH_URL based on the environment
const nextAuthUrl = process.env.NODE_ENV === 'production' 
  ? process.env.NEXTAUTH_URL_PROD 
  : process.env.NEXTAUTH_URL;

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
          // Update the most recent LOGIN event for this user to include their email
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
        }
      } catch (error) {
        console.error("Error updating login record:", error);
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };