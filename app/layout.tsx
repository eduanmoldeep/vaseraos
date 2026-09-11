import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaseraOS — Society Management",
  description: "Housing society management on Cloudflare: residents, maintenance, complaints, visitors, notices.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/residents", label: "Residents" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/complaints", label: "Complaints" },
  { href: "/visitors", label: "Visitors" },
  { href: "/notices", label: "Notices" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-sm text-white dark:bg-white dark:text-black">
                V
              </span>
              VaseraOS
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          VaseraOS · Next.js on Cloudflare Workers · D1 + R2 + KV
        </footer>
      </body>
    </html>
  );
}
