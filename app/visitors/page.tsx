"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import type { Visitor } from "@/lib/cloudflare";

export default function VisitorsPage() {
  const [rows, setRows] = useState<Visitor[]>([]);
  const [form, setForm] = useState({ name: "", flat: "", purpose: "Guest" });

  const load = () => fetch("/api/visitors").then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/visitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", flat: "", purpose: "Guest" });
    load();
  }

  return (
    <div>
      <PageHeader title="Visitors" subtitle="Gate log — expected → checked in → checked out." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required placeholder="Visitor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Flat to visit" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Pre-approve</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No visitors logged." /> : rows.map((v) => (
          <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{v.name} <span className="text-zinc-500">→ {v.flat}</span></p>
              <p className="text-xs text-zinc-500">{v.purpose}</p>
            </div>
            <Badge tone={v.status === "checked_in" ? "green" : v.status === "checked_out" ? "zinc" : "blue"}>{v.status.replace("_", " ")}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
