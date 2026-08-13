import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Rally Investor Matching",
  description:
    "Founder-facing investor matching and CRM workflow for early-stage companies.",
  icons: {
    icon: "/brand/rally-icon.png",
    apple: "/brand/rally-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link
          rel="stylesheet"
          href="https://widget.meetvolley.com/static/css/widget.css"
        />
      </head>
      <body>
        {children}
        <Toaster />
        <Script
          src="https://widget.meetvolley.com/widget.js"
          data-widget="https://api.meetvolley.com/api/public/get-widget/ee36abbc-51c2-43ed-84aa-0ac36d7188e0"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
