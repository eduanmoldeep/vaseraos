"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Bill } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function MaintenancePage() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [rows, setRows] = useState<Bill[]>([]);
  const [form, setForm] = useState({ flat: "", amount: "", month: "2026-09" });
  const [loading, setLoading] = useState(() => !!getSelectedSociety());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/bills?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load bills."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/bills?society=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data) setRows(data); })
        .catch(() => setError("Couldn't load bills."))
        .finally(() => setLoading(false));
    }
    const onSwitch = (e: Event) => { const next = (e as CustomEvent<string | null>).detail ?? null; setSociety(next); load(next); };
    window.addEventListener("vaseraos-society", onSwitch);
    return () => window.removeEventListener("vaseraos-society", onSwitch);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/bills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), society_id: getSelectedSociety() }),
      });
      setForm({ flat: "", amount: "", month: "2026-09" });
      load();
    } catch {
      setError("Couldn't raise bill. Try again.");
    } finally {
      setSaving(false);
    }
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
      <PageHeader title="Maintenance" subtitle={loading ? "Bills, dues & collection." : `Outstanding collection: ₹${due.toLocaleString("en-IN")}`} />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <Input required placeholder="Flat" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} />
          <Input required type="number" min="0" placeholder="Amount ₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input required type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          <Button busy={saving} busyText="Raising…">Raise bill</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No bills yet." />
        ) : (
          rows.map((b) => (
            <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{b.flat} <span className="text-zinc-500">· {b.month}</span></p>
                <p className="text-sm">₹{b.amount.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={b.status === "paid" ? "green" : b.status === "overdue" ? "red" : "amber"}>{b.status}</Badge>
                <Select
                  value={b.status}
                  onChange={(e) => setStatus(b.id, e.target.value)}
                  className="w-auto px-2 py-1 text-xs"
                  aria-label={`Bill status for ${b.flat} ${b.month}`}
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="overdue">overdue</option>
                </Select>
                <Button variant="danger" size="sm" onClick={() => remove(b.id)} aria-label={`Delete bill for ${b.flat} ${b.month}`}>
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
