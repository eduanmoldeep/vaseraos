"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Expense } from "@/lib/cloudflare";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";

type LedgerEntry = { id: string; type: "income" | "expense"; label: string; amount: number; date: string; receipt_key: string | null };
type Ledger = { income: number; expenses: number; balance: number; entries: LedgerEntry[] };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const receiptUrl = (key: string) => `/api/uploads/${key}`;

export default function LedgerPage() {
  const society = useSelectedSociety();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({ vendor: "", category: "general", amount: "", description: "" });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (id: string | null = society) => {
    if (!id) { setLedger(null); setExpenses([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/ledger?society=${id}`).then((r) => r.json()),
      fetch(`/api/expenses?society=${id}`).then((r) => r.json()),
    ])
      .then(([l, e]) => { setLedger(l); setExpenses(e); })
      .catch(() => setError("Couldn't load the ledger."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("society_id", getSelectedSociety() ?? "");
      fd.set("vendor", form.vendor);
      fd.set("category", form.category);
      fd.set("amount", form.amount);
      fd.set("description", form.description);
      if (receipt) fd.set("receipt", receipt);
      const res = await fetch("/api/expenses", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't log expense."); return; }
      setForm({ vendor: "", category: "general", amount: "", description: "" });
      setReceipt(null);
      load();
    } catch {
      setError("Couldn't log expense. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Ledger" subtitle="Income, expenses & running balance." />
        <div className="mt-4"><NeedsSociety label="ledger" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ledger"
        subtitle={loading || !ledger ? "Income, expenses & running balance." : `Balance: ${inr(ledger.balance)}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Collected</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{ledger ? inr(ledger.income) : "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Spent</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600 dark:text-rose-400">{ledger ? inr(ledger.expenses) : "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Balance</p>
          <p className="mt-1 text-2xl font-semibold">{ledger ? inr(ledger.balance) : "—"}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <p className="text-sm font-medium">Log an expense (treasurer)</p>
        <form onSubmit={addExpense} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input required placeholder="Vendor / paid to" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="general">General</option>
            <option value="maintenance">Maintenance & repairs</option>
            <option value="utilities">Utilities</option>
            <option value="staff">Staff salaries</option>
            <option value="security">Security</option>
          </Select>
          <Input required type="number" min="1" placeholder="Amount ₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500">Receipt (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-zinc-400 dark:file:bg-zinc-800"
            />
          </div>
          <div className="sm:col-span-2">
            <Button busy={saving} busyText="Logging…">Log expense</Button>
          </div>
        </form>
      </Card>

      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <Card className="mt-4">
        <p className="text-sm font-medium">Expenses</p>
        <div className="mt-3 grid gap-3">
          {loading ? (
            <ListSkeleton />
          ) : expenses.length === 0 ? (
            <Empty text="No expenses logged yet." />
          ) : (
            expenses.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                <div>
                  <p className="font-medium">{e.vendor} <span className="text-zinc-500">· {e.category}</span></p>
                  <p className="text-sm">{inr(e.amount)}{e.description ? ` — ${e.description}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.receipt_key ? (
                    <a href={receiptUrl(e.receipt_key)} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      Receipt
                    </a>
                  ) : null}
                  <Button variant="danger" size="sm" onClick={() => removeExpense(e.id)} aria-label={`Delete expense to ${e.vendor}`}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-sm font-medium">All activity</p>
        <div className="mt-3 grid gap-2">
          {loading ? (
            <ListSkeleton />
          ) : !ledger || ledger.entries.length === 0 ? (
            <Empty text="No activity yet." />
          ) : (
            ledger.entries.map((e) => (
              <div key={`${e.type}-${e.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 py-2 text-sm last:border-0 dark:border-zinc-800">
                <span>{e.label}</span>
                <div className="flex items-center gap-3">
                  <Badge tone={e.type === "income" ? "green" : "red"}>{e.type === "income" ? `+${inr(e.amount)}` : `-${inr(e.amount)}`}</Badge>
                  {e.receipt_key ? (
                    <a href={receiptUrl(e.receipt_key)} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      Receipt
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
