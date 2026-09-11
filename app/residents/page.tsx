"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import type { Resident } from "@/lib/cloudflare";

export default function ResidentsPage() {
  const [rows, setRows] = useState<Resident[]>([]);
  const [form, setForm] = useState({ name: "", flat: "", phone: "" });

  const load = () => fetch("/api/residents").then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/residents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", flat: "", phone: "" });
    load();
  }

  return (
    <div>
      <PageHeader title="Residents" subtitle="Stored in Cloudflare D1 (demo data when running locally without bindings)." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Flat (e.g. A-101)" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Add resident</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No residents yet." /> : rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{r.name} <span className="text-zinc-500">· {r.flat}</span></p>
              <p className="text-xs text-zinc-500">{r.phone} · {r.members} members</p>
            </div>
            <Badge tone={r.owner_tenant === "owner" ? "blue" : "amber"}>{r.owner_tenant}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
