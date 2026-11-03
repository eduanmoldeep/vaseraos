"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { timeAgo } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

type Notification = { id: string; title: string; body?: string | null; link?: string | null; read_at?: string | null; created_at: string };

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
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <Icon name="bell" className="h-6 w-6" />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-16 z-40 rounded-2xl border sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-lg font-semibold">Notifications</p>
            {unread > 0 ? (
              <button onClick={markAllRead} className="min-h-10 rounded-lg px-2 text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="mt-1 max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-base text-zinc-600 dark:text-zinc-400">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-base transition hover:bg-zinc-100 dark:hover:bg-zinc-900 ${!n.read_at ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                >
                  <p className="font-semibold">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{n.body}</p> : null}
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{timeAgo(n.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
