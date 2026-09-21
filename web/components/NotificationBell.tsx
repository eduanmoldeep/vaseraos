"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelectedSociety } from "@/lib/society";

type Notification = { id: string; title: string; body?: string | null; link?: string | null; read_at?: string | null; created_at: string };

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Bell with an unread count, polling every 30s. Dropdown lists recent notifications and marks them read on open. */
export function NotificationBell() {
  const society = useSelectedSociety();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = (id: string | null = society) => {
    if (!id) { setUnread(0); setItems([]); return; }
    fetch(`/api/notifications?society=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setUnread(d.unread); setItems(d.items); } })
      .catch(() => {});
  };

  useEffect(() => {
    startTransition(() => load(society));
    const interval = setInterval(() => startTransition(() => load(society)), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    if (!society) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ society_id: society }),
    });
    setUnread(0);
    setItems((rows) => rows.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }

  if (!society) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.66V5a2 2 0 1 0-4 0v.34A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 ? (
              <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="mt-1 max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-zinc-500">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-2 py-2 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!n.read_at ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-zinc-500">{n.body}</p> : null}
                  <p className="mt-1 text-[11px] text-zinc-400">{timeAgo(n.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
