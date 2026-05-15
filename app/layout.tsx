import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyPips AI",
  description: "Smart Forex Signals Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
