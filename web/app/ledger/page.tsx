"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { useSelectedSociety } from "@/lib/society";

type LedgerEntry = { id: string; type: "income" | "expense"; label: string; amount: number; date: string; receipt_key: string | null };
type Ledger = { income: number; expenses: number; balance: number; entries: LedgerEntry[] };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const receiptUrl = (key: string) => `/api/uploads/${key}`;

/** Read-only for residents — treasurers log expenses from /admin/ledger. */
export default function ResidentLedgerPage() {
  const router = useRouter();
  const society = useSelectedSociety();
  const [checked, setChecked] = useState(false);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d?.user) router.replace("/"); })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const load = () => {
    if (!society) { setLedger(null); setLoading(false); return; }
    setLoading(true);
    setDenied(false);
    fetch(`/api/ledger?society=${society}`)
      .then((r) => { if (r.status === 403) { setDenied(true); return null; } return r.ok ? r.json() : null; })
      .then(setLedger)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  if (!checked) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Card className="animate-pulse"><div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-900" /></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <PageHeader title="Ledger" subtitle="Your society's income, expenses & running balance — read only." />

      {!society ? (
        <Card><p className="text-sm text-zinc-500">Select a society first.</p></Card>
      ) : denied ? (
        <Card><p className="text-sm text-zinc-500">The society ledger is visible to flat owners only.</p></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Collected</p>
              <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">{ledger ? inr(ledger.income) : "—"}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Spent</p>
              <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">{ledger ? inr(ledger.expenses) : "—"}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Balance</p>
              <p className="mt-1 text-xl font-semibold">{ledger ? inr(ledger.balance) : "—"}</p>
            </Card>
          </div>

          <Card className="mt-4">
            <p className="text-sm font-medium">All activity</p>
            <div className="mt-3 grid gap-2">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
                  <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900" />
                </div>
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
        </>
      )}

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back
      </Link>
    </div>
  );
}
