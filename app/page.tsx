"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";

type Summary = { residents: number; dues: number; openComplaints: number; activeVisitors: number };
type Notice = { id: string; title: string; body: string };

const MODULES = [
  { href: "/residents", title: "Residents", desc: "Flats, owners, tenants & members" },
  { href: "/maintenance", title: "Maintenance", desc: "Bills, dues & collection" },
  { href: "/complaints", title: "Complaints", desc: "Tickets & resolution status" },
  { href: "/visitors", title: "Visitors", desc: "Gate entries & check-ins" },
  { href: "/notices", title: "Notices", desc: "Announcements (R2 attachments)" },
];

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    fetch("/api/summary").then((r) => r.json()).then(setSummary).catch(() => {});
    fetch("/api/notices").then((r) => r.json()).then((d) => setNotices(d.slice(0, 3))).catch(() => {});
  }, []);

  const stats = [
    { label: "Residents", value: summary?.residents ?? "—" },
    { label: "Outstanding dues", value: summary ? `₹${summary.dues.toLocaleString("en-IN")}` : "—" },
    { label: "Open complaints", value: summary?.openComplaints ?? "—" },
    { label: "Active visitors", value: summary?.activeVisitors ?? "—" },
  ];

  return (
    <div>
      <PageHeader
        title="Society overview"
        subtitle="Live from Cloudflare D1 (falls back to demo data locally)."
        action={<Badge tone="green">Workers · D1 · R2 · KV</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-medium">Modules</h2>
          <ul className="mt-3 space-y-2">
            {MODULES.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                  <span>
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="block text-xs text-zinc-500">{m.desc}</span>
                  </span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-medium">Latest notices</h2>
          <div className="mt-3 space-y-3">
            {notices.length === 0 ? (
              <p className="text-sm text-zinc-500">No notices yet.</p>
            ) : (
              notices.map((n) => (
                <div key={n.id} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{n.body}</p>
                </div>
              ))
            )}
          </div>
          <Link href="/notices" className="mt-4 inline-block text-sm font-medium underline">
            View all notices
          </Link>
        </Card>
      </div>
    </div>
  );
}
