import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { APP_RELEASE_LABEL } from "@/lib/app-version";

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: {
    default: APP_RELEASE_LABEL,
    template: `%s | ${APP_RELEASE_LABEL}`,
  },
  description: "A modern rental marketplace and housing workflow application for properties, applications, documents, inspections, leases, and ledgers.",
  openGraph: {
    title: APP_RELEASE_LABEL,
    description: "Browse rental units and manage the full housing workflow in one secure platform.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-slate-950 focus:shadow-lg">Skip to content</a>
        <AppHeader />
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
        ) : null}
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
