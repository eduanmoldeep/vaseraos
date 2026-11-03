import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { TEXT_SIZE_INIT_SCRIPT } from "@/lib/textSizeScript";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the pre-paint text-size script sets data-text-size on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning className={`h-full antialiased ${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-base text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_INIT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`,
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-base focus:font-semibold focus:shadow-lg dark:focus:bg-zinc-900"
        >
          Skip to content
        </a>
        <ImpersonationBanner />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
