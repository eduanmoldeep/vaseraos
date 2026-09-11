import type { Metadata, Viewport } from "next";
import Link from "next/link";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-teal-50/60 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`,
          }}
        />
        <header className="border-b border-teal-900/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-800 to-emerald-600 text-sm font-bold text-white shadow">
                V
              </span>
              VaseraOS
            </Link>
            <span className="text-xs text-zinc-500">Society management, minus the paperwork</span>
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
