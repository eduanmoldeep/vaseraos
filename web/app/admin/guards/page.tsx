"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Badge, Button, Card, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader, PhoneLink, SuccessBanner } from "@/components/ui";
import type { Guard, GuardSalaryConfig, GuardSalaryPayment } from "@/lib/cloudflare";
import { formatDate, formatPeriod, inr } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

export default function GuardsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Guard[] | null>(null);
  const [salaryConfig, setSalaryConfig] = useState<Record<string, GuardSalaryConfig>>({});
  const [payments, setPayments] = useState<Record<string, GuardSalaryPayment[]>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const loadSalary = (id: string) => {
    fetch(`/api/guards/salary?society=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((cfgs: GuardSalaryConfig[]) => setSalaryConfig(Object.fromEntries(cfgs.map((c) => [c.guard_id, c]))))
      .catch(() => {});
    fetch(`/api/guards/salary/payments?society=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: GuardSalaryPayment[]) => {
        const byGuard: Record<string, GuardSalaryPayment[]> = {};
        for (const p of list) (byGuard[p.guard_id] ??= []).push(p);
        setPayments(byGuard);
      })
      .catch(() => {});
  };

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    fetch(`/api/guards?society=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError("Couldn't load guards."));
    loadSalary(id);
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function deactivate(g: Guard) {
    if (!confirm(`Deactivate ${g.name}? They will no longer be able to sign in or receive SOS alarms.`)) return;
    await fetch(`/api/guards?id=${g.id}&society=${society}`, { method: "DELETE" });
    setDone(`${g.name} has been deactivated.`);
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Guards" />
        <NeedsSociety label="guards" />
      </div>
    );
  }

  const active = (rows ?? []).filter((g) => g.active);
  const inactive = (rows ?? []).filter((g) => !g.active);

  return (
    <div>
      <PageHeader title="Guards" subtitle="Security staff. They get the SOS alarm on the VaseraOS Guard phone app." />

      <Card tone="amber" className="mb-6">
        <p className="text-lg font-semibold">Guard app sign-in details</p>
        <p className="mt-1 text-base">
          Give each guard this <span className="font-semibold">Society ID</span>, plus the phone number and password you set for them:
        </p>
        <p className="mt-2 select-all rounded-xl bg-white px-4 py-3 font-mono text-xl font-bold dark:bg-zinc-900">{society}</p>
      </Card>

      <AddGuard society={society} onAdded={(name) => { setDone(`${name} has been added. Share the sign-in details above with them.`); load(); }} />

      {done ? <div className="mt-4"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <div className="mt-6 grid gap-3">
        {rows === null ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No guards yet." hint="Add your first guard so SOS alarms reach someone." />
        ) : (
          <>
            {active.map((g) => (
              <Card key={g.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{g.name}</p>
                    <PhoneLink phone={g.phone} />
                  </div>
                  <Badge tone="green">On duty</Badge>
                </div>
                <SalaryPanel guard={g} society={society} config={salaryConfig[g.id]} payments={payments[g.id] ?? []} onChange={(msg) => { if (msg) setDone(msg); loadSalary(society); }} />
                <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <Button variant="danger" size="sm" onClick={() => deactivate(g)}>
                    Deactivate guard
                  </Button>
                </div>
              </Card>
            ))}
            {inactive.length > 0 ? (
              <details className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <summary className="flex min-h-12 cursor-pointer items-center px-5 text-base font-medium">Deactivated guards ({inactive.length})</summary>
                <ul className="divide-y divide-zinc-200 px-5 pb-3 dark:divide-zinc-800">
                  {inactive.map((g) => (
                    <li key={g.id} className="flex items-center justify-between py-3 text-base">
                      <span>{g.name} · {g.phone}</span>
                      <Badge tone="zinc">Deactivated</Badge>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function AddGuard({ society, onAdded }: { society: string; onAdded: (name: string) => void }) {
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/guards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add the guard.");
      const name = form.name;
      setForm({ name: "", phone: "", password: "" });
      close();
      onAdded(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the guard.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Add a guard" icon="shield">
      {(close) => (
        <form onSubmit={(e) => add(e, close)} className="grid gap-4 sm:grid-cols-3">
          <Field label="Guard's name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Phone number" hint="They sign in with this.">
            <Input required type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Password" hint="At least 8 characters. Tell it to the guard.">
            <Input required type="text" autoComplete="off" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {error ? <div className="sm:col-span-3"><ErrorBanner text={error} /></div> : null}
          <Button icon="check" busy={saving} busyText="Adding…" className="sm:col-span-3 sm:w-fit">
            Add guard
          </Button>
        </form>
      )}
    </AddPanel>
  );
}

function SalaryPanel({
  guard,
  society,
  config,
  payments,
  onChange,
}: {
  guard: Guard;
  society: string;
  config?: GuardSalaryConfig;
  payments: GuardSalaryPayment[];
  onChange: (message?: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "pay" | "set">("idle");
  const [amount, setAmount] = useState("");
  // The amount saved from this panel, used until the reloaded config arrives — so "Pay salary" is pre-filled right away.
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const monthly = justSaved ?? config?.monthly_amount ?? null;
  const [pay, setPay] = useState({ amount: "", note: "", early: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function open(next: "pay" | "set") {
    setErr("");
    if (next === "set") setAmount(monthly !== null ? String(monthly) : "");
    if (next === "pay") setPay({ amount: monthly !== null ? String(monthly) : "", note: "", early: false });
    setMode(next);
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/guards/salary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guard_id: guard.id, society_id: society, monthly_amount: Number(amount) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save the salary.");
      setJustSaved(Number(amount));
      setMode("idle");
      onChange(`${guard.name}'s monthly salary is now ${inr(Number(amount))}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the salary.");
    } finally {
      setBusy(false);
    }
  }

  async function logPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/guards/salary/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guard_id: guard.id, society_id: society, amount: Number(pay.amount), early: pay.early, note: pay.note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't record the payment.");
      setMode("idle");
      onChange(`Recorded ${inr(Number(pay.amount))} paid to ${guard.name}. It also appears in Accounts.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't record the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
      <p className="text-base">
        <span className="font-medium">Monthly salary: </span>
        {monthly !== null ? <span className="font-bold">{inr(monthly)}</span> : <span className="text-zinc-600 dark:text-zinc-400">not set</span>}
      </p>
      {payments[0] ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Last paid {inr(payments[0].amount)} on {formatDate(payments[0].created_at)} for {formatPeriod(payments[0].period)}
        </p>
      ) : null}

      {mode === "idle" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon="wallet" onClick={() => open("pay")}>
            Pay salary
          </Button>
          <Button variant="secondary" onClick={() => open("set")}>
            {monthly !== null ? "Change monthly salary" : "Set monthly salary"}
          </Button>
        </div>
      ) : mode === "set" ? (
        <form onSubmit={saveConfig} className="mt-3 grid gap-3">
          <Field label="Monthly salary (₹)">
            <Input required type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
          {err ? <ErrorBanner text={err} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button icon="check" busy={busy} busyText="Saving…">Save</Button>
            <Button type="button" variant="secondary" onClick={() => setMode("idle")}>Cancel</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={logPayment} className="mt-3 grid gap-3">
          <Field label="Amount paid (₹)">
            <Input required type="number" inputMode="numeric" min={1} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} autoFocus />
          </Field>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base">
            <input type="checkbox" className="h-6 w-6 accent-indigo-600" checked={pay.early} onChange={(e) => setPay({ ...pay, early: e.target.checked })} />
            This is an early or part payment
          </label>
          <Field label={pay.early ? "Reason" : "Note"} optional={!pay.early}>
            <Input required={pay.early} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder={pay.early ? "e.g. medical emergency advance" : ""} />
          </Field>
          {err ? <ErrorBanner text={err} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button icon="check" busy={busy} busyText="Saving…">Record payment</Button>
            <Button type="button" variant="secondary" onClick={() => setMode("idle")}>Cancel</Button>
          </div>
        </form>
      )}

      {payments.length > 1 ? (
        <details className="mt-3">
          <summary className="flex min-h-10 cursor-pointer items-center text-base font-medium text-indigo-700 dark:text-indigo-300">Earlier payments</summary>
          <ul className="mt-1 grid gap-1 text-base">
            {payments.slice(1, 8).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-2">
                <span className="font-semibold">{inr(p.amount)}</span>
                <span className="text-zinc-600 dark:text-zinc-400">on {formatDate(p.created_at)} for {formatPeriod(p.period)}</span>
                {p.early ? <Badge tone="amber">early / part</Badge> : null}
                {p.note ? <span className="italic text-zinc-600 dark:text-zinc-400">“{p.note}”</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
