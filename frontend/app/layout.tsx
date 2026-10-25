import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";
import { Providers } from "./providers";

// Downloaded at build time and self-hosted by Next.js; no runtime request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Vestadz Marketing Analyst", template: "%s · Vestadz Marketing Analyst" },
  description: "Multi-client advertising analytics for Vestadz",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body>
        <Providers>
          <Suspense>
            <AppShell>{children}</AppShell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
