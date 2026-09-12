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
            href="/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            My info
          </Link>
          <Link
            href="/complaints"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5v15l-3.5-2-3.5 2-3.5-2-3.5 2v-15Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            My complaints
          </Link>
          <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9.5 9.5a2.5 2.5 0 0 1 4.83-.94c.4 1.06-.33 1.72-.98 2.25-.6.5-1.35 1.02-1.35 2.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="16.75" r="0.9" fill="currentColor" stroke="none" />
            </svg>
            Help
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 16l4-4-4-4M20 12H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
