"use client";

import { startTransition, useEffect, useState } from "react";
import { useResident } from "@/components/ResidentShell";
import { Card, Empty, ListSkeleton, PageHeader } from "@/components/ui";
import type { Notice } from "@/lib/cloudflare";
import { formatDate } from "@/lib/labels";

export default function NoticesPage() {
  const { society } = useResident();
  const [notices, setNotices] = useState<(Notice & { created_at?: string })[] | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    if (!society) return;
    startTransition(() => {
      fetch(`/api/notices?society=${society}`).then((r) => (r.ok ? r.json() : [])).then(setNotices).catch(() => setNotices([]));
    });
  }, [society]);

  // Scroll to and briefly highlight the notice a push/bell/home click pointed at (#n_<id>).
  useEffect(() => {
    if (!notices || notices.length === 0) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    startTransition(() => setHighlighted(hash));
    const t = setTimeout(() => startTransition(() => setHighlighted(null)), 3000);
    return () => clearTimeout(t);
  }, [notices]);

  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements from your society committee." />

      {notices === null ? (
        <ListSkeleton />
      ) : notices.length === 0 ? (
        <Empty text="No notices yet." hint="New announcements from the committee will show up here." />
      ) : (
        <div className="grid gap-4">
          {notices.map((n) => {
            const anchorId = `n_${n.id}`;
            const isHighlighted = highlighted === anchorId;
            return (
              <article key={n.id} id={anchorId} className="scroll-mt-28">
                <Card tone={isHighlighted ? "indigo" : "default"} className="transition-colors">
                  <h2 className="text-xl font-semibold leading-snug">{n.title}</h2>
                  {n.created_at ? <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">{formatDate(n.created_at)}</p> : null}
                  <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">{n.body}</p>
                </Card>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
