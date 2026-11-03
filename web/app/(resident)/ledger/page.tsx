"use client";

import { startTransition, useEffect, useState } from "react";
import { useResident } from "@/components/ResidentShell";
import { Card, Empty, ListSkeleton, PageHeader, Section, Stat } from "@/components/ui";
import { formatDate, inr } from "@/lib/labels";

type LedgerEntry = { id: string; type: "income" | "expense"; label: string; amount: number; date: string; receipt_key: string | null };
type Ledger = { income: number; expenses: number; balance: number; entries: LedgerEntry[] };

/** Read-only for flat owners — office bearers record spending from /admin/ledger. */
export default function ResidentLedgerPage() {
  const { society } = useResident();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    if (!society) return;
    startTransition(() => {
      fetch(`/api/ledger?society=${society}`)
        .then((r) => {
          if (r.status === 403) {
            setState("denied");
            return null;
          }
          return r.ok ? r.json() : null;
        })
        .then((d) => {
          if (d) {
            setLedger(d);
            setState("ready");
          }
        })
        .catch(() => setState("ready"));
    });
  }, [society]);

  return (
    <div>
      <PageHeader back={{ href: "/app", label: "Back to Home" }} title="Society accounts" subtitle="Money collected and spent by your society. You can look but not change anything here." />

      {state === "denied" ? (
        <Empty text="Only flat owners can see the society accounts." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Money collected" value={ledger ? inr(ledger.income) : "…"} tone="good" />
            <Stat label="Money spent" value={ledger ? inr(ledger.expenses) : "…"} tone="bad" />
            <Stat label="Balance now" value={ledger ? inr(ledger.balance) : "…"} />
          </div>

          <Section title="All payments in and out">
            {state === "loading" ? (
              <ListSkeleton />
            ) : !ledger || ledger.entries.length === 0 ? (
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
            )}
          </Section>
        </>
      )}
    </div>
  );
}
