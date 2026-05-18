import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { AppFooter } from "@/components/AppFooter";
import { APP_RELEASE_LABEL } from "@/lib/app-version";
import { ScrollReset } from "@/components/ScrollReset";

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: {
    default: APP_RELEASE_LABEL,
    template: `%s | ${APP_RELEASE_LABEL}`,
  },
  description: "A premium housing operations platform for rentals, applications, documents, inspections, leases, payments, communication, and ledgers.",
  openGraph: {
    title: APP_RELEASE_LABEL,
    description: "Operate rental housing workflows, marketplace discovery, payments, messaging, and compliance in one secure platform.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getVerifiedCurrentUser();

  return (
    <html lang="en">
      <body>
        <ScrollReset />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-slate-950 focus:shadow-lg">Skip to content</a>
        <AppHeader user={user} />
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
        ) : null}
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
