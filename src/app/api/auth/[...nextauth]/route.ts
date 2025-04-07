import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  // Add other configurations like callbacks if needed later
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };