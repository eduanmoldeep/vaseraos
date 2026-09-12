"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import { getSelectedSociety } from "@/lib/society";

type Summary = { residents: number; dues: number; openComplaints: number; activeVisitors: number };
type Notice = { id: string; title: string; body: string };

const MODULES = [
  { href: "/admin/societies", title: "Societies", desc: "Admin: tenants & switching", dot: "bg-teal-500" },
  { href: "/admin/residents", title: "Residents", desc: "Flats, owners, tenants & members", dot: "bg-sky-500" },
  { href: "/admin/maintenance", title: "Maintenance", desc: "Bills, dues & collection", dot: "bg-amber-500" },
  { href: "/admin/complaints", title: "Complaints", desc: "Tickets & resolution status", dot: "bg-rose-500" },
  { href: "/admin/visitors", title: "Visitors", desc: "Gate entries & check-ins", dot: "bg-violet-500" },
  { href: "/admin/notices", title: "Notices", desc: "Announcements with attachments", dot: "bg-emerald-500" },
];

export default function Home() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const load = (id: string | null = society) => {
    if (!id) { setSummary(null); setNotices([]); return; }
    fetch(`/api/summary?society=${id}`).then((r) => r.json()).then(setSummary).catch(() => {});
    fetch(`/api/notices?society=${id}`).then((r) => r.json()).then((d) => setNotices(d.slice(0, 3))).catch(() => {});
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/summary?society=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data) setSummary(data); })
        .catch(() => {});
      fetch(`/api/notices?society=${id}`)
        .then((r) => r.json())
        .then((d) => { if (d) setNotices(d.slice(0, 3)); })
        .catch(() => {});
    }
    const onSwitch = (e: Event) => { const next = (e as CustomEvent<string | null>).detail ?? null; setSociety(next); load(next); };
    window.addEventListener("vaseraos-society", onSwitch);
    return () => window.removeEventListener("vaseraos-society", onSwitch);
  }, []);

  const stats = [
    { label: "Residents", value: summary?.residents ?? "—", dot: "bg-sky-500" },
    { label: "Outstanding dues", value: summary ? `₹${summary.dues.toLocaleString("en-IN")}` : "—", dot: "bg-amber-500" },
    { label: "Open complaints", value: summary?.openComplaints ?? "—", dot: "bg-rose-500" },
    { label: "Active visitors", value: summary?.activeVisitors ?? "—", dot: "bg-emerald-500" },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Live society data at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {society ? (
          stats.map((s) => (
            <Card key={s.label}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</p>
            </Card>
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-4"><NeedsSociety label="dashboard stats" /></div>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-medium">Modules</h2>
          <ul className="mt-3 space-y-1">
            {MODULES.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${m.dot}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="block truncate text-xs text-zinc-500">{m.desc}</span>
                  </span>
                  <span aria-hidden className="ml-auto text-zinc-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-medium">Latest notices</h2>
          {!society ? (
            <p className="mt-3 text-sm text-zinc-500">Select a society to see notices.</p>
          ) : (
          <div className="mt-3 space-y-3">
            {notices.length === 0 ? (
              <p className="text-sm text-zinc-500">No notices yet.</p>
            ) : (
              notices.map((n) => (
                <div key={n.id} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{n.body}</p>
                </div>
              ))
            )}
          </div>
          )}
          <Link href="/admin/notices" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            View all notices
          </Link>
        </Card>
      </div>
    </div>
  );
}
