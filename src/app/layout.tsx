import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Elite club display face — engraved serif headlines
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  themeColor: "#12100b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Conclave — The Private Founders' Club",
  manifest: "/manifest.webmanifest",
  applicationName: "Conclave",
  appleWebApp: {
    capable: true,
    title: "Conclave",
    statusBarStyle: "black-translucent",
  },
  description:
    "Conclave is an elite, invite-only private club for startup and business builders. Submit your venture for review, earn your invitation, and build with co-founders inside the circle. Not a job board — a club of owners.",
  keywords: [
    "startups", "co-founder", "entrepreneurship", "founders club",
    "private club", "elite network", "business builders", "invite-only", "conclave",
  ],
  authors: [{ name: "Conclave Committee" }],
  openGraph: {
    title: "Conclave — The Private Founders' Club",
    description:
      "An elite private club for startup & business builders. Membership is earned, never bought.",
    siteName: "Conclave",
    type: "website",
    images: [{ url: "/og.png", width: 1344, height: 768, alt: "Conclave — the private founders' club" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conclave — The Private Founders' Club",
    description: "An elite private club for startup & business builders. Membership is earned.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Sonner position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
