import type { Metadata, Viewport } from "next";
import Link from "next/link";
import DemoSwitch from "@/components/DemoSwitch";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessPath AI",
  description: "Check if your MBTA subway trip is step-free right now.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:font-bold">
          Skip to main content
        </a>
        <header className="border-b-2 border-slate-300 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="inline-flex min-h-[44px] items-center text-2xl font-extrabold text-slate-900">
              AccessPath AI
            </Link>
            <Link href="/trip/new" className="btn inline-flex min-h-[44px] items-center rounded-lg border-2 border-blue-800 px-4 text-lg font-bold text-blue-900">
              Edit trip
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-2xl px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto max-w-2xl border-t-2 border-slate-300 px-4 py-6">
          <DemoSwitch />
          <p className="mt-4 text-base text-slate-700">
            Data from the MBTA. Always check with station staff if you are unsure. This is a hackathon demo.
          </p>
        </footer>
      </body>
    </html>
  );
}
