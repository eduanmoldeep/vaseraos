"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { getSelectedSociety } from "@/lib/society";

type Summary = { residents: number; dues: number; openComplaints: number; activeVisitors: number };
type Notice = { id: string; title: string; body: string };

const MODULES = [
  { href: "/societies", title: "Societies", desc: "Admin: tenants & switching", color: "bg-teal-500" },
  { href: "/residents", title: "Residents", desc: "Flats, owners, tenants & members", color: "bg-sky-500" },
  { href: "/maintenance", title: "Maintenance", desc: "Bills, dues & collection", color: "bg-amber-500" },
  { href: "/complaints", title: "Complaints", desc: "Tickets & resolution status", color: "bg-rose-500" },
  { href: "/visitors", title: "Visitors", desc: "Gate entries & check-ins", color: "bg-violet-500" },
  { href: "/notices", title: "Notices", desc: "Announcements (R2 attachments)", color: "bg-emerald-500" },
];

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const load = (society = getSelectedSociety()) => {
    fetch(`/api/summary?society=${society}`).then((r) => r.json()).then(setSummary).catch(() => {});
    fetch(`/api/notices?society=${society}`).then((r) => r.json()).then((d) => setNotices(d.slice(0, 3))).catch(() => {});
  };
  useEffect(() => {
    load();
    const onSwitch = (e: Event) => load((e as CustomEvent<string>).detail);
    window.addEventListener("vaseraos-society", onSwitch);
    return () => window.removeEventListener("vaseraos-society", onSwitch);
  }, []);

  const stats = [
    { label: "Residents", value: summary?.residents ?? "—", bar: "bg-sky-500", soft: "bg-sky-50 dark:bg-sky-950/40" },
    { label: "Outstanding dues", value: summary ? `₹${summary.dues.toLocaleString("en-IN")}` : "—", bar: "bg-amber-500", soft: "bg-amber-50 dark:bg-amber-950/40" },
    { label: "Open complaints", value: summary?.openComplaints ?? "—", bar: "bg-rose-500", soft: "bg-rose-50 dark:bg-rose-950/40" },
    { label: "Active visitors", value: summary?.activeVisitors ?? "—", bar: "bg-emerald-500", soft: "bg-emerald-50 dark:bg-emerald-950/40" },
  ];

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-800 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Society overview</h1>
            <p className="mt-1 text-sm text-teal-100/80">Live from Cloudflare D1 (falls back to demo data locally).</p>
          </div>
          <Badge tone="green">Workers · D1 · R2 · KV</Badge>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className={`overflow-hidden p-0`}>
            <div className={`h-1.5 ${s.bar}`} />
            <div className={`p-5 ${s.soft}`}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-medium">Modules</h2>
          <ul className="mt-3 space-y-2">
            {MODULES.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition hover:-translate-y-px hover:shadow-sm dark:border-zinc-800 dark:hover:bg-zinc-900">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${m.color}`}>
                    {m.title[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="block truncate text-xs text-zinc-500">{m.desc}</span>
                  </span>
                  <span aria-hidden className="ml-auto">→</span>
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
