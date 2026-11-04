"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/lib/cloudflare";
import { Icon, type IconName } from "@/components/icons";
import { PushToggle } from "@/components/PushToggle";

/** Top-right identity control: avatar + name, opens to account links, alerts switch and log out. */
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/");
  }

  if (!viewer) return null;
  const initial = viewer.name ? viewer.name[0].toUpperCase() : "?";

  const item = (href: string, icon: IconName, label: string) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-base text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <Icon name={icon} />
      {label}
    </Link>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Account menu"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-base font-bold text-white dark:bg-zinc-200 dark:text-zinc-900">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-base font-medium sm:inline">{viewer.name}</span>
        <Icon name="chevronDown" className="hidden h-4 w-4 sm:block" />
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-16 z-40 rounded-2xl border sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72 border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-2 py-2">
            <p className="truncate text-base font-semibold">{viewer.name}</p>
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{viewer.email}</p>
          </div>
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          {!viewer.admin ? item("/app", "home", "My home") : null}
          {item("/me", "user", "My account & text size")}
          <div className="px-1 py-1">
            <PushToggle />
          </div>
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          {item("/help", "help", "Get help")}
          {item("/feedback", "lightbulb", "Suggest an improvement")}
          <button
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-base text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Icon name="logout" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
