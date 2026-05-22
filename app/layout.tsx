import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchFrame AI",
  description: "Generate premium Instagram promo images from mobile app screenshots.",
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
