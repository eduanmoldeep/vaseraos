"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Bill } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function MaintenancePage() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [rows, setRows] = useState<Bill[]>([]);
  const [form, setForm] = useState({ flat: "", amount: "", month: "2026-09" });

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); return; }
    fetch(`/api/bills?society=${id}`).then((r) => r.json()).then(setRows).catch(() => {});
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/bills?society=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data) setRows(data); })
        .catch(() => {});
    }
    const onSwitch = (e: Event) => { const next = (e as CustomEvent<string | null>).detail ?? null; setSociety(next); load(next); };
    window.addEventListener("vaseraos-society", onSwitch);
    return () => window.removeEventListener("vaseraos-society", onSwitch);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/bills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), society_id: getSelectedSociety() }),
    });
    setForm({ flat: "", amount: "", month: "2026-09" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/bills", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this bill?")) return;
    await fetch(`/api/bills?id=${id}`, { method: "DELETE" });
    load();
  }

  const due = rows.filter((b) => b.status !== "paid").reduce((a, b) => a + b.amount, 0);

  if (!society) {
    return (
      <div>
        <PageHeader title="Maintenance" subtitle="Bills, dues & collection." />
        <div className="mt-4"><NeedsSociety label="bills" /></div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <Badge tone={b.status === "paid" ? "green" : b.status === "overdue" ? "red" : "amber"}>{b.status}</Badge>
              <select
                value={b.status}
                onChange={(e) => setStatus(b.id, e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                aria-label={`Bill status for ${b.flat} ${b.month}`}
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="overdue">overdue</option>
              </select>
              <button
                onClick={() => remove(b.id)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                aria-label={`Delete bill for ${b.flat} ${b.month}`}
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
