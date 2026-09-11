import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SocietySwitcher } from "@/components/SocietySwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaseraOS — Society Management",
  description: "Housing society management on Cloudflare: residents, maintenance, complaints, visitors, notices.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "VaseraOS", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d7a70",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/societies", label: "Societies" },
  { href: "/residents", label: "Residents" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/complaints", label: "Complaints" },
  { href: "/visitors", label: "Visitors" },
  { href: "/notices", label: "Notices" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-teal-50/60 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`,
          }}
        />
        <header className="sticky top-0 z-10 border-b border-teal-900/20 bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-900 text-white shadow-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-teal-900 shadow">
                V
              </span>
              VaseraOS
            </Link>
            <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-teal-50/85 transition hover:bg-white/15 hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <SocietySwitcher />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-teal-900/10 py-6 text-center text-xs text-zinc-500 dark:border-white/10">
          VaseraOS · installable PWA · Next.js on Cloudflare Workers · D1 + R2 + KV
        </footer>
      </body>
    </html>
  );
}
