"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import type { Bill } from "@/lib/cloudflare";

export default function MaintenancePage() {
  const [rows, setRows] = useState<Bill[]>([]);
  const [form, setForm] = useState({ flat: "", amount: "", month: "2026-09" });

  const load = () => fetch("/api/bills").then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/bills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setForm({ flat: "", amount: "", month: "2026-09" });
    load();
  }

  const due = rows.filter((b) => b.status !== "paid").reduce((a, b) => a + b.amount, 0);

  return (
    <div>
      <PageHeader title="Maintenance" subtitle={`Outstanding collection: ₹${due.toLocaleString("en-IN")}`} />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required placeholder="Flat" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required type="number" min="0" placeholder="Amount ₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Raise bill</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No bills yet." /> : rows.map((b) => (
          <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{b.flat} <span className="text-zinc-500">· {b.month}</span></p>
              <p className="text-sm">₹{b.amount.toLocaleString("en-IN")}</p>
            </div>
            <Badge tone={b.status === "paid" ? "green" : b.status === "overdue" ? "red" : "amber"}>{b.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
