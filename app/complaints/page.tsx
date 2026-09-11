"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import type { Complaint } from "@/lib/cloudflare";

export default function ComplaintsPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ flat: "", title: "", category: "general" });

  const load = () => fetch("/api/complaints").then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/complaints", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setForm({ flat: "", title: "", category: "general" });
    load();
  }

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Tickets flow into D1; triage by status." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required placeholder="Flat" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Issue title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <option value="general">General</option>
            <option value="maintenance">Maintenance</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="security">Security</option>
          </select>
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Raise ticket</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No complaints." /> : rows.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-zinc-500">{c.flat} · {c.category}</p>
            </div>
            <Badge tone={c.status === "resolved" ? "green" : c.status === "in_progress" ? "blue" : "amber"}>{c.status.replace("_", " ")}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
