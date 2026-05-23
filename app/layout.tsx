import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromoForce",
  description: "AI marketing pipeline for app store screenshots, social launch packs, and autopilot content calendars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="teal">
      <body>{children}</body>
    </html>
  );
}
