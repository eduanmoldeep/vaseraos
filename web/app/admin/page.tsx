"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Card, LinkButton, PageHeader, Section, Stat } from "@/components/ui";
import type { Bill, Complaint, Notice, Visitor } from "@/lib/cloudflare";
import { inr } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

type Summary = { residents: number; dues: number; openComplaints: number; activeVisitors: number };

/** Committee home: the jobs waiting on someone first, then quick actions, then the numbers. */
export default function AdminDashboard() {
  const society = useSelectedSociety();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!society) return;
    startTransition(() => {
      const json = <T,>(url: string, fallback: T) => fetch(url).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback) as Promise<T>;
      json<Summary | null>(`/api/summary?society=${society}`, null).then(setSummary);
      json<Bill[]>(`/api/bills?society=${society}`, []).then(setBills);
      json<Complaint[]>(`/api/complaints?society=${society}`, []).then(setComplaints);
      json<Visitor[]>(`/api/visitors?society=${society}`, []).then(setVisitors);
      json<Notice[]>(`/api/notices?society=${society}`, []).then((d) => setNotices(d.slice(0, 3)));
    });
  }, [society]);

  if (!society) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <NeedsSociety label="the dashboard" />
      </div>
    );
  }

  const toApprove = bills?.filter((b) => b.status === "pending_verification").length;
  const newComplaints = complaints?.filter((c) => c.status === "open").length;
  const expected = visitors?.filter((v) => v.status === "expected").length;
  const loaded = toApprove !== undefined && newComplaints !== undefined && expected !== undefined;
  const allClear = loaded && toApprove === 0 && newComplaints === 0 && expected === 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="What needs your attention today." />

      <h2 className="sr-only">Needs your attention</h2>
      {allClear ? (
        <Card tone="green">
          <p className="flex items-center gap-2 text-lg font-semibold text-green-900 dark:text-green-200">
            <Icon name="check" className="h-6 w-6" /> All caught up — nothing is waiting on you.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <AttentionCard href="/admin/maintenance" icon="wallet" count={toApprove} one="payment to approve" many="payments to approve" />
          <AttentionCard href="/admin/complaints" icon="wrench" count={newComplaints} one="new complaint" many="new complaints" />
          <AttentionCard href="/admin/visitors" icon="door" count={expected} one="visitor expected" many="visitors expected" />
        </div>
      )}

      <Section title="Quick actions">
        <div className="grid gap-2 sm:grid-cols-3">
          <LinkButton href="/admin/notices" variant="secondary" icon="megaphone" className="justify-start">Post a notice</LinkButton>
          <LinkButton href="/admin/residents" variant="secondary" icon="users" className="justify-start">Add a resident</LinkButton>
          <LinkButton href="/admin/ledger" variant="secondary" icon="receipt" className="justify-start">Record an expense</LinkButton>
        </div>
      </Section>

      <Section title="At a glance">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Residents" value={summary?.residents ?? "…"} href="/admin/residents" />
          <Stat label="Unpaid dues" value={summary ? inr(summary.dues) : "…"} href="/admin/maintenance" />
          <Stat label="Open complaints" value={summary?.openComplaints ?? "…"} href="/admin/complaints" />
          <Stat label="Visitors expected or inside" value={summary?.activeVisitors ?? "…"} href="/admin/visitors" />
        </div>
      </Section>

      <Section title="Latest notices" action={<LinkButton href="/admin/notices" variant="secondary" size="sm">All notices</LinkButton>}>
        {notices.length === 0 ? (
          <p className="text-base text-zinc-600 dark:text-zinc-400">No notices yet.</p>
        ) : (
          <div className="grid gap-3">
            {notices.map((n) => (
              <Card key={n.id}>
                <p className="text-lg font-semibold">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-base text-zinc-700 dark:text-zinc-300">{n.body}</p>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function AttentionCard({ href, icon, count, one, many }: { href: string; icon: IconName; count: number | undefined; one: string; many: string }) {
  const busy = (count ?? 0) > 0;
  return (
    <Link
      href={href}
      className={`flex min-h-20 items-center gap-4 rounded-2xl border-2 p-4 transition ${
        busy
          ? "border-amber-400 bg-amber-50 hover:border-amber-500 dark:border-amber-700 dark:bg-amber-950/30"
          : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${busy ? "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-3xl font-bold leading-none">{count ?? "…"}</span>
        <span className="mt-1 block text-base font-medium">{count === 1 ? one : many}</span>
      </span>
      <Icon name="chevronRight" className="h-5 w-5 text-zinc-500" />
    </Link>
  );
}
