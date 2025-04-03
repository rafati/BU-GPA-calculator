import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Keep existing CSS import
import { SessionProvider } from "@/providers/SessionProvider"; // *** ADD THIS IMPORT ***

// Keep existing font setup
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

// *** UPDATE METADATA (Recommended) ***
export const metadata: Metadata = {
  title: "Bethlehem University GPA Calculator", // Updated title
  description: "GPA Calculator for BU Students", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Keep existing body tag and className */}
      <body className={`${inter.className} antialiased`}>
        {/* *** WRAP CHILDREN WITH SESSIONPROVIDER *** */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}