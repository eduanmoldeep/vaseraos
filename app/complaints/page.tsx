"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import type { Complaint } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function ComplaintsPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ flat: "", title: "", category: "general" });

  const load = (society = getSelectedSociety()) =>
    fetch(`/api/complaints?society=${society}`).then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => {
    load();
    const onSwitch = (e: Event) => load((e as CustomEvent<string>).detail);
    window.addEventListener("vaseraos-society", onSwitch);
    return () => window.removeEventListener("vaseraos-society", onSwitch);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/complaints", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, society_id: getSelectedSociety() }) });
    setForm({ flat: "", title: "", category: "general" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/complaints", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this complaint?")) return;
    await fetch(`/api/complaints?id=${id}`, { method: "DELETE" });
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
            <div className="flex items-center gap-2">
              <Badge tone={c.status === "resolved" ? "green" : c.status === "in_progress" ? "blue" : "amber"}>{c.status.replace("_", " ")}</Badge>
              <select
                value={c.status}
                onChange={(e) => setStatus(c.id, e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                aria-label={`Complaint status for ${c.title}`}
              >
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="resolved">resolved</option>
              </select>
              <button
                onClick={() => remove(c.id)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                aria-label={`Delete complaint ${c.title}`}
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
