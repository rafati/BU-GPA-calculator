import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
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