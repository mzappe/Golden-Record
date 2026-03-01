import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golden Record",
  description: "Cosmic collector channels with collection, social, and market tools."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
