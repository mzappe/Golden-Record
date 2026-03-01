import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collectra",
  description: "Retro collector channels with collection, market, and utility tools."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
