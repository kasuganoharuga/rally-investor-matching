import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rally Investor Matching",
  description:
    "Founder-facing investor matching and CRM workflow for early-stage companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
