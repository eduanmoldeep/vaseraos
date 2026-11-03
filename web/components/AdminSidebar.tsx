"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { SocietySwitcher } from "@/components/SocietySwitcher";
import { isAdminNavActive, visibleAdminNav } from "@/lib/adminNav";
import { useIsPlatformAdmin } from "@/lib/useViewer";

/** Desktop shell: society switcher on top, then committee tools grouped by job (Today / Money / People). */
export function AdminSidebar() {
  const pathname = usePathname();
  const isPlatformAdmin = useIsPlatformAdmin();
  const groups = visibleAdminNav(isPlatformAdmin);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <SocietySwitcher />
      </div>

      <nav aria-label="Committee tools" className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            <p className="px-3 pb-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{g.title}</p>
            <ul className="grid gap-0.5">
              {g.items.map((n) => {
                const active = isAdminNavActive(pathname, n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-base transition ${
                        active
                          ? "bg-indigo-50 font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon name={n.icon} />
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="grid gap-1 border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        {!isPlatformAdmin ? (
          <Link href="/app" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-base text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
            <Icon name="home" />
            My home
          </Link>
        ) : null}
        <Link href="/admin/about" className="px-3 py-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300">
          About VaseraOS
        </Link>
      </div>
    </aside>
  );
}
