import type { Metadata } from "next";
import { fontClassNames } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triptactix - AI-Powered Travel Planning & Booking Platform",
  description: "Plan your perfect trip with AI-generated itineraries, compare flights, trains & hotels, and get price predictions for travel in India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={fontClassNames}>
        {children}
      </body>
    </html>
  );
}
