import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Keep existing CSS import
import "./print-styles.css"; // Add print styles
import { SessionProvider } from "@/providers/SessionProvider"; // *** ADD THIS IMPORT ***
import BuildInfo from "@/components/BuildInfo"; // Import BuildInfo component

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
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
              {children}
            </main>
            <footer className="py-2 px-4 text-center">
              <BuildInfo />
            </footer>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}