"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { useSelectedSociety } from "@/lib/society";
import type { Notice } from "@/lib/cloudflare";

export default function NoticesPage() {
  const router = useRouter();
  const society = useSelectedSociety();
  const [checked, setChecked] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d?.user) router.replace("/"); })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const load = () => {
    if (!society) { setNotices([]); return; }
    fetch(`/api/notices?society=${society}`).then((r) => (r.ok ? r.json() : [])).then(setNotices).catch(() => {});
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  // Scroll to and briefly highlight the notice a push/bell click pointed at (#n_<id>).
  useEffect(() => {
    if (notices.length === 0) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    startTransition(() => setHighlighted(hash));
    const t = setTimeout(() => startTransition(() => setHighlighted(null)), 2500);
    return () => clearTimeout(t);
  }, [notices]);

  if (!checked) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Card className="animate-pulse"><div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-900" /></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <PageHeader title="Notices" subtitle="Announcements from your society." />

      {!society ? (
        <Card><p className="text-sm text-zinc-500">Select a society first.</p></Card>
      ) : notices.length === 0 ? (
        <Empty text="No notices yet." />
      ) : (
        <div className="grid gap-3">
          {notices.map((n) => {
            const anchorId = `n_${n.id}`;
            const isHighlighted = highlighted === anchorId;
            return (
              <div key={n.id} id={anchorId}>
                <Card className={isHighlighted ? "!border-indigo-400 !bg-indigo-50 transition-colors dark:!border-indigo-500 dark:!bg-indigo-950/30" : "transition-colors"}>
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{n.body}</p>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back
      </Link>
    </div>
  );
}
