import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Susu — rotating savings on FlowVault",
  description:
    "A rotating savings circle (ajo / esusu) on Stacks, built on FlowVault's programmable routing primitives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="glass sticky top-0 z-50">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3.5 text-sm">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="glow inline-block h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
              Susu
            </Link>
            <div className="flex items-center gap-5 text-[var(--muted)]">
              <Link href="/circles" className="transition-colors hover:text-white">
                Browse
              </Link>
              <Link href="/create" className="transition-colors hover:text-white">
                Create
              </Link>
            </div>
            <span className="ml-auto rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs text-[var(--muted)]">
              Stacks testnet
            </span>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
