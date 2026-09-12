"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/lib/cloudflare";

/** Top-right identity control: avatar initials + name, opens to show email and log out. */
export function UserMenu() {
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setViewer(d?.user ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  if (!viewer) return null;
  const initial = viewer.name ? viewer.name[0].toUpperCase() : "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Account menu"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white dark:bg-zinc-200 dark:text-zinc-900">
          {initial}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:inline">{viewer.name}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium">{viewer.name}</p>
            <p className="truncate text-xs text-zinc-500">{viewer.email}</p>
          </div>
          <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Help
          </Link>
          <button
            onClick={logout}
            className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
