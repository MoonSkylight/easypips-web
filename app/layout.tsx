import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyPips AI",
  description: "Live forex signals dashboard with risk-aware execution levels.",
  icons: {
    icon: "/favicon.svg",
  },
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