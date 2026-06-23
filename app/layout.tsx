import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Light "High-Performance Precision" type system: Hanken Grotesk across the UI,
// JetBrains Mono for technical labels/data.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Sustainable 5R",
  description: "Aplikasi Audit Sustainable 5R — Sinar Mas Agribusiness and Food",
};

export const viewport: Viewport = {
  themeColor: "#E30613",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={cn(
          hanken.variable,
          mono.variable,
          "min-h-dvh font-sans antialiased"
        )}
      >
        {children}
      </body>
    </html>
  );
}
