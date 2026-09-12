"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/adminNav";
import { useIsPlatformAdmin } from "@/lib/useViewer";

/** Horizontal nav pills for the mobile top bar (the sidebar covers md+). */
export function AdminNav() {
  const pathname = usePathname();
  const isPlatformAdmin = useIsPlatformAdmin();
  const nav = ADMIN_NAV.filter((n) => !n.platformOnly || isPlatformAdmin);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {nav.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 transition ${
              active
                ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
