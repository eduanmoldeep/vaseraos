"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";
import type { Guard, GuardSalaryConfig, GuardSalaryPayment } from "@/lib/cloudflare";

export default function GuardsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const [salaryConfig, setSalaryConfig] = useState<Record<string, GuardSalaryConfig>>({});
  const [payments, setPayments] = useState<Record<string, GuardSalaryPayment[]>>({});

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/guards?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load guards."))
      .finally(() => setLoading(false));
    loadSalary(id);
  };

  const loadSalary = (id: string) => {
    fetch(`/api/guards/salary?society=${id}`)
      .then((r) => r.json())
      .then((cfgs: GuardSalaryConfig[]) => setSalaryConfig(Object.fromEntries(cfgs.map((c) => [c.guard_id, c]))))
      .catch(() => {});
    fetch(`/api/guards/salary/payments?society=${id}`)
      .then((r) => r.json())
      .then((rows: GuardSalaryPayment[]) => {
        const byGuard: Record<string, GuardSalaryPayment[]> = {};
        for (const p of rows) (byGuard[p.guard_id] ??= []).push(p);
        setPayments(byGuard);
      })
      .catch(() => {});
  };

  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/guards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: getSelectedSociety() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add guard.");
      setForm({ name: "", phone: "", password: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add guard.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Deactivate this guard? They'll no longer be able to log in or receive alerts.")) return;
    setRemoving(id);
    try {
      await fetch(`/api/guards?id=${id}&society=${society}`, { method: "DELETE" });
      load();
    } finally {
      setRemoving(null);
    }
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Guards" subtitle="Security staff who get the panic-alarm on a resident SOS." />
        <div className="mt-4"><NeedsSociety label="guards" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Guards" subtitle="Security staff who get the panic-alarm on a resident SOS — logged in on the separate guard app, not this site." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required placeholder="Phone (their guard-app login)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input required type="password" placeholder="Password (8+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button busy={saving} busyText="Adding…">Add guard</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No guards yet." />
        ) : (
          rows.map((g) => (
            <Card key={g.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-zinc-500">{g.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!g.active ? <Badge tone="red">deactivated</Badge> : null}
                  {g.active ? (
                    <Button variant="danger" size="sm" busy={removing === g.id} busyText="Removing…" onClick={() => remove(g.id)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
              <GuardSalaryPanel
                guard={g}
                society={society}
                config={salaryConfig[g.id]}
                payments={payments[g.id] ?? []}
                onChange={() => loadSalary(society)}
              />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function GuardSalaryPanel({
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
  onChange: () => void;
}) {
  const [amount, setAmount] = useState(config ? String(config.monthly_amount) : "");
  const [savingConfig, setSavingConfig] = useState(false);
  const [pay, setPay] = useState({ amount: "", note: "", early: false });
  const [logging, setLogging] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => setAmount(config ? String(config.monthly_amount) : ""), [config]);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setErr("");
    try {
      const res = await fetch("/api/guards/salary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guard_id: guard.id, society_id: society, monthly_amount: Number(amount) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save salary.");
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save salary.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function logPayment(e: React.FormEvent) {
    e.preventDefault();
    setLogging(true);
    setErr("");
    try {
      const res = await fetch("/api/guards/salary/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guard_id: guard.id, society_id: society, amount: Number(pay.amount), early: pay.early, note: pay.note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't log payment.");
      setPay({ amount: "", note: "", early: false });
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't log payment.");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
      <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">Salary</p>
      <form onSubmit={saveConfig} className="flex flex-wrap items-center gap-2">
        <Input
          required
          type="number"
          min={1}
          className="w-40"
          placeholder="Monthly amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button size="sm" busy={savingConfig} busyText="Saving…">
          {config ? "Update monthly amount" : "Set monthly amount"}
        </Button>
        {config ? <span className="text-xs text-zinc-500">last set {new Date(config.updated_at).toLocaleDateString()}</span> : null}
      </form>

      <form onSubmit={logPayment} className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          required
          type="number"
          min={1}
          className="w-32"
          placeholder="Pay amount (₹)"
          value={pay.amount}
          onChange={(e) => setPay({ ...pay, amount: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" checked={pay.early} onChange={(e) => setPay({ ...pay, early: e.target.checked })} />
          Early / partial (urgency)
        </label>
        <Input
          className="w-56 flex-1"
          placeholder={pay.early ? "Reason (required)" : "Note (optional)"}
          value={pay.note}
          onChange={(e) => setPay({ ...pay, note: e.target.value })}
        />
        <Button size="sm" variant="secondary" busy={logging} busyText="Logging…">
          Log payment
        </Button>
      </form>

      {err ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</p> : null}

      {payments.length > 0 ? (
        <div className="mt-3 grid gap-1">
          {payments.slice(0, 5).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">₹{p.amount}</span>
              <span>for {p.period}</span>
              {p.early ? <Badge tone="amber">early/partial</Badge> : null}
              {p.note ? <span className="italic">"{p.note}"</span> : null}
              <span>{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
