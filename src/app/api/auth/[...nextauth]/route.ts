import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";

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
  // Add other configurations like callbacks if needed later
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };