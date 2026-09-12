"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/adminNav";
import { useIsPlatformAdmin } from "@/lib/useViewer";
import { SocietySwitcher } from "@/components/SocietySwitcher";

/** Desktop shell: society (not brand) is the identity up top; VaseraOS is a quiet footer credit. */
export function AdminSidebar() {
  const pathname = usePathname();
  const isPlatformAdmin = useIsPlatformAdmin();
  const nav = ADMIN_NAV.filter((n) => !n.platformOnly || isPlatformAdmin);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <SocietySwitcher />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((n) => {
          const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link href="/admin/about" className="block text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400">
          VaseraOS
        </Link>
      </div>
    </aside>
  );
}
