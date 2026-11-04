"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Button, Card, Empty, ErrorBanner, Field, FilePicker, Input, ListSkeleton, PageHeader, Section, Select, Stat, SuccessBanner, Tabs } from "@/components/ui";
import type { Expense } from "@/lib/cloudflare";
import { EXPENSE_CATEGORIES, formatDate, inr, labelFor } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

type LedgerEntry = { id: string; type: "income" | "expense"; label: string; amount: number; date: string; receipt_key: string | null };
type Ledger = { income: number; expenses: number; balance: number; entries: LedgerEntry[] };
type View = "all" | "expenses";

export default function LedgerPage() {
  const society = useSelectedSociety();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [view, setView] = useState<View>("all");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    Promise.all([
      fetch(`/api/ledger?society=${id}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/expenses?society=${id}`).then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([l, e]) => {
        setLedger(l);
        setExpenses(e);
      })
      .catch(() => setError("Couldn't load the accounts."));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function removeExpense(e: Expense) {
    if (!confirm(`Delete the ${inr(e.amount)} expense to ${e.vendor}? This can't be undone.`)) return;
    await fetch(`/api/expenses?id=${e.id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <NeedsSociety label="the accounts" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Accounts" subtitle="Money collected, money spent, and what's left. Flat owners can see this too." />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Money collected" value={ledger ? inr(ledger.income) : "…"} tone="good" />
        <Stat label="Money spent" value={ledger ? inr(ledger.expenses) : "…"} tone="bad" />
        <Stat label="Balance now" value={ledger ? inr(ledger.balance) : "…"} />
      </div>

      <div className="mt-6">
        <AddExpense society={society} onAdded={() => { setDone("Expense recorded."); load(); }} />
      </div>

      {done ? <div className="mt-4"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <Section title="History">
        <Tabs<View>
          label="Show"
          value={view}
          onChange={setView}
          tabs={[
            { id: "all", label: "Everything" },
            { id: "expenses", label: "Expenses only", count: expenses?.length },
          ]}
        />
        <div className="mt-4">
          {ledger === null || expenses === null ? (
            <ListSkeleton />
          ) : view === "all" ? (
            ledger.entries.length === 0 ? (
              <Empty text="Nothing recorded yet." />
            ) : (
              <Card padding="none">
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {ledger.entries.map((e) => (
                    <li key={`${e.type}-${e.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4">
                      <span className="min-w-0">
                        <span className="block text-lg">{e.label}</span>
                        <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                          {e.type === "income" ? "Money in" : "Money out"}
                          {e.date ? ` · ${formatDate(e.date)}` : ""}
                          {e.receipt_key ? (
                            <>
                              {" · "}
                              <a href={`/api/uploads/${e.receipt_key}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
                                See receipt
                              </a>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className={`text-lg font-bold ${e.type === "income" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                        {e.type === "income" ? "+" : "−"}
                        {inr(e.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          ) : expenses.length === 0 ? (
            <Empty text="No expenses recorded yet." />
          ) : (
            <div className="grid gap-3">
              {expenses.map((e) => (
                <Card key={e.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">
                      {inr(e.amount)} <span className="font-normal">to {e.vendor}</span>
                    </p>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">
                      {labelFor(EXPENSE_CATEGORIES, e.category)}
                      {e.created_at ? ` · ${formatDate(e.created_at)}` : ""}
                      {e.description ? ` · ${e.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.receipt_key ? (
                      <a href={`/api/uploads/${e.receipt_key}`} target="_blank" rel="noreferrer" className="text-base font-medium text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
                        Receipt
                      </a>
                    ) : null}
                    <Button variant="danger" size="sm" onClick={() => removeExpense(e)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function AddExpense({ society, onAdded }: { society: string; onAdded: () => void }) {
  const empty = { vendor: "", category: "general", amount: "", description: "" };
  const [form, setForm] = useState(empty);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("society_id", society);
      fd.set("vendor", form.vendor);
      fd.set("category", form.category);
      fd.set("amount", form.amount);
      fd.set("description", form.description);
      if (receipt) fd.set("receipt", receipt);
      const res = await fetch("/api/expenses", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't record the expense.");
      setForm(empty);
      setReceipt(null);
      close();
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Record an expense" icon="receipt">
      {(close) => (
        <form onSubmit={(e) => add(e, close)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid to" hint="Person or company, e.g. City Electricals">
            <Input required value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} autoFocus />
          </Field>
          <Field label="Amount (₹)">
            <Input required type="number" inputMode="numeric" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="What for?">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note" optional>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <FilePicker label="Add a receipt photo (optional)" file={receipt} onChange={setReceipt} accept="image/*,application/pdf" />
          </div>
          {error ? <div className="sm:col-span-2"><ErrorBanner text={error} /></div> : null}
          <Button icon="check" busy={saving} busyText="Saving…" className="sm:col-span-2 sm:w-fit">
            Save expense
          </Button>
        </form>
      )}
    </AddPanel>
  );
}
