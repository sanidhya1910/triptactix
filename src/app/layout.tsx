import type { Metadata, Viewport } from "next";
import { fontClassNames } from "@/lib/fonts";
import ClientWrapper from "@/components/client-wrapper";
import "./globals.css";

const SITE_URL = "https://triptactix.pages.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Triptactix - fare predictions and AI trip planning for India",
    template: "%s · Triptactix",
  },
  description:
    "Fare predictions trained on 600,000 real bookings across six Indian metros, flight and hotel comparison, and AI-generated itineraries.",
  applicationName: "Triptactix",
  openGraph: {
    type: "website",
    siteName: "Triptactix",
    url: SITE_URL,
    title: "Book at the right price, not the panic price",
    description:
      "Fare predictions trained on 600,000 real bookings across six Indian metros. Plus AI itineraries for the rest.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Book at the right price, not the panic price",
    description:
      "Fare predictions trained on 600,000 real bookings across six Indian metros.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontClassNames}>
      <body className="grain bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-surface"
        >
          Skip to content
        </a>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
