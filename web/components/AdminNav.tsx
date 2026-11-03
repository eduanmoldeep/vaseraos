"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { isAdminNavActive, visibleAdminNav } from "@/lib/adminNav";
import { useIsPlatformAdmin } from "@/lib/useViewer";

/**
 * Phone navigation for committee tools: one clearly-labelled "Menu" button that
 * opens a full-screen list — every section with a one-line description —
 * instead of a long sideways-scrolling row of small pills.
 */
export function AdminNav() {
  const pathname = usePathname();
  const isPlatformAdmin = useIsPlatformAdmin();
  const groups = visibleAdminNav(isPlatformAdmin);
  const [open, setOpen] = useState(false);
  const current = groups.flatMap((g) => g.items).find((i) => isAdminNavActive(pathname, i.href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-zinc-300 px-4 text-left text-base font-semibold dark:border-zinc-700"
      >
        <Icon name="menu" className="h-6 w-6" />
        <span className="flex-1 truncate">{current ? current.label : "Menu"}</span>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">All sections</span>
        <Icon name="chevronDown" className="h-5 w-5 text-zinc-500" />
      </button>

      {/* Portal to <body>: the sticky header's backdrop-blur would otherwise trap this fixed overlay inside it. */}
      {open ? createPortal(
        <div role="dialog" aria-modal="true" aria-label="Committee menu" className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xl font-bold">Menu</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="flex min-h-12 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-base font-semibold dark:border-zinc-700"
            >
              <Icon name="x" /> Close
            </button>
          </div>
          <nav aria-label="Committee tools" className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
            {groups.map((g) => (
              <div key={g.title} className="mt-4">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{g.title}</p>
                <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {g.items.map((n) => {
                    const active = isAdminNavActive(pathname, n.href);
                    return (
                      <li key={n.href}>
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-16 items-center gap-3 px-4 py-2.5 ${active ? "bg-indigo-50 dark:bg-indigo-950/40" : ""}`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-indigo-600 text-white" : `bg-zinc-100 dark:bg-zinc-800 ${n.color}`}`}>
                            <Icon name={n.icon} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-lg font-semibold">{n.label}</span>
                            <span className="block text-sm text-zinc-600 dark:text-zinc-400">{n.description}</span>
                          </span>
                          <Icon name="chevronRight" className="h-5 w-5 text-zinc-400" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="mt-6 grid gap-2">
              {!isPlatformAdmin ? (
                <Link href="/app" onClick={() => setOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 px-4 text-lg font-semibold dark:border-zinc-800">
                  <Icon name="home" /> My home (as a resident)
                </Link>
              ) : null}
              <Link href="/me" onClick={() => setOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 px-4 text-lg font-semibold dark:border-zinc-800">
                <Icon name="user" /> My account &amp; text size
              </Link>
              <button type="button" onClick={logout} className="flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 px-4 text-left text-lg font-semibold dark:border-zinc-800">
                <Icon name="logout" /> Log out
              </button>
            </div>
          </nav>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
