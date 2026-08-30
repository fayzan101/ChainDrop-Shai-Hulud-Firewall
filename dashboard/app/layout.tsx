import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SentryHulud analyst queue",
  description: "Review quarantine and block verdicts from CI scans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <p className="site-title">SentryHulud</p>
            <nav className="site-nav">
              <Link href="/queue">Queue</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
