import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Keep existing font imports
import "./globals.css"; // Keep existing CSS import
import { SessionProvider } from "@/providers/SessionProvider"; // *** ADD THIS IMPORT ***

// Keep existing font setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* *** WRAP CHILDREN WITH SESSIONPROVIDER *** */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}