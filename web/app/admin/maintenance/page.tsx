"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import {
  Badge,
  Button,
  Card,
  ChoiceGroup,
  Empty,
  ErrorBanner,
  Field,
  FilePicker,
  Input,
  ListSkeleton,
  PageHeader,
  Section,
  SuccessBanner,
  Tabs,
  buttonClass,
} from "@/components/ui";
import type { Bill, Cadence, MaintenanceSetting } from "@/lib/cloudflare";
import { BILL_STATUS, formatPeriod, inr, statusOf } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

const CADENCES = [
  { value: "monthly", label: "Every month" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "yearly", label: "Every year" },
] as const;
const CADENCE_WORDS: Record<Cadence, string> = { monthly: "every month", quarterly: "every 3 months", yearly: "every year" };

type View = "approve" | "unpaid" | "paid";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function MaintenancePage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Bill[] | null>(null);
  const [setting, setSetting] = useState<MaintenanceSetting | null | undefined>(undefined);
  const [view, setView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    fetch(`/api/bills?society=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError("Couldn't load bills."));
  };
  const loadSetting = (id: string | null = society) => {
    if (!id) return;
    fetch(`/api/maintenance/settings?society=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MaintenanceSetting | null) => setSetting(d ?? null))
      .catch(() => setSetting(null));
  };
  useEffect(() => {
    startTransition(() => {
      load(society);
      loadSetting(society);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function patch(id: string, status: string, file?: File | null, message?: string) {
    setError("");
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    if (file) fd.set("receipt", file);
    const res = await fetch("/api/bills", { method: "PATCH", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't update that bill.");
      return;
    }
    if (message) setDone(message);
    load();
  }

  async function remove(b: Bill) {
    if (!confirm(`Delete the ${formatPeriod(b.month)} bill for flat ${b.flat}? This can't be undone.`)) return;
    await fetch(`/api/bills?id=${b.id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Maintenance dues" />
        <NeedsSociety label="bills" />
      </div>
    );
  }

  const all = rows ?? [];
  const approve = all.filter((b) => b.status === "pending_verification");
  const unpaid = all.filter((b) => b.status === "pending" || b.status === "overdue");
  const paid = all.filter((b) => b.status === "paid");
  const currentView: View = view ?? (approve.length > 0 ? "approve" : "unpaid");
  const listed = (currentView === "approve" ? approve : currentView === "unpaid" ? unpaid : paid).filter((b) =>
    query.trim() ? b.flat.toLowerCase().includes(query.trim().toLowerCase()) : true
  );
  const unpaidTotal = unpaid.reduce((a, b) => a + b.amount, 0);

  return (
    <div>
      <PageHeader title="Maintenance dues" subtitle={rows ? `Still to collect: ${inr(unpaidTotal)} from ${unpaid.length} bill${unpaid.length === 1 ? "" : "s"}.` : "Bills and payments."} />

      <SettingsCard society={society} setting={setting} onSaved={(s) => { setSetting(s); load(); setDone("Payment settings saved."); }} />

      {done ? <div className="mt-4"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <Section title="Bills" action={<OneOffBill society={society} onAdded={() => { load(); setDone("Bill added."); }} />}>
        <Tabs<View>
          label="Show bills"
          value={currentView}
          onChange={setView}
          tabs={[
            { id: "approve", label: "To approve", count: approve.length },
            { id: "unpaid", label: "Unpaid", count: unpaid.length },
            { id: "paid", label: "Paid", count: paid.length },
          ]}
        />
        {all.length > 6 ? (
          <Field label="Find a flat" className="mt-4">
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. A-101" />
          </Field>
        ) : null}

        <div className="mt-4 grid gap-3">
          {rows === null ? (
            <ListSkeleton />
          ) : listed.length === 0 ? (
            <Empty
              text={currentView === "approve" ? "No payments waiting for approval." : currentView === "unpaid" ? "No unpaid bills." : "No paid bills yet."}
              hint={currentView === "approve" ? "When a resident sends a payment screenshot, it shows up here." : undefined}
            />
          ) : (
            listed.map((b) => <BillRow key={b.id} bill={b} onPatch={patch} onDelete={() => remove(b)} />)
          )}
        </div>
      </Section>
    </div>
  );
}

function BillRow({
  bill: b,
  onPatch,
  onDelete,
}: {
  bill: Bill;
  onPatch: (id: string, status: string, file?: File | null, message?: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [marking, setMarking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const s = statusOf(BILL_STATUS, b.status);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">Flat {b.flat}</p>
          <p className="text-base text-zinc-600 dark:text-zinc-400">{formatPeriod(b.month)}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{inr(b.amount)}</p>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
      </div>

      {b.status === "pending_verification" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {b.receipt_key ? (
            <a href={`/api/uploads/${b.receipt_key}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
              See screenshot
            </a>
          ) : null}
          <Button icon="check" busy={busy === "approve"} busyText="Approving…" onClick={() => run("approve", () => onPatch(b.id, "paid", null, `Flat ${b.flat}'s payment approved.`))}>
            Approve — mark paid
          </Button>
          <Button
            variant="secondary"
            busy={busy === "reject"}
            onClick={() => {
              if (confirm(`Reject this payment from flat ${b.flat}? The bill goes back to unpaid.`)) run("reject", () => onPatch(b.id, "pending"));
            }}
          >
            Reject
          </Button>
        </div>
      ) : b.status === "paid" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {b.receipt_key ? (
            <a href={`/api/uploads/${b.receipt_key}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
              See receipt
            </a>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            busy={busy === "undo"}
            onClick={() => {
              if (confirm(`Mark flat ${b.flat}'s ${formatPeriod(b.month)} bill as NOT paid?`)) run("undo", () => onPatch(b.id, "pending"));
            }}
          >
            Mark as not paid
          </Button>
        </div>
      ) : marking ? (
        <div className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-base font-medium">Record that flat {b.flat} paid {inr(b.amount)}</p>
          <FilePicker label="Add a receipt photo (optional)" file={file} onChange={setFile} accept="image/*,application/pdf" />
          <div className="flex flex-wrap gap-2">
            <Button icon="check" busy={busy === "paid"} busyText="Saving…" onClick={() => run("paid", () => onPatch(b.id, "paid", file, `Flat ${b.flat} marked as paid.`))}>
              Confirm paid
            </Button>
            <Button variant="secondary" onClick={() => { setMarking(false); setFile(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button icon="check" onClick={() => setMarking(true)}>
            Mark as paid
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              busy={busy === "overdue"}
              onClick={() => run("overdue", () => onPatch(b.id, b.status === "overdue" ? "pending" : "overdue"))}
            >
              {b.status === "overdue" ? "Not overdue" : "Mark overdue"}
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SettingsCard({
  society,
  setting,
  onSaved,
}: {
  society: string;
  setting: MaintenanceSetting | null | undefined;
  onSaved: (s: MaintenanceSetting) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ amount: "", cadence: "monthly" as Cadence, upi_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit() {
    setForm({ amount: setting ? String(setting.amount) : "", cadence: setting?.cadence ?? "monthly", upi_id: setting?.upi_id ?? "" });
    setError("");
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/maintenance/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: Number(form.amount), cadence: form.cadence, upi_id: form.upi_id, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save the settings.");
      setEditing(false);
      onSaved(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the settings.");
    } finally {
      setSaving(false);
    }
  }

  if (setting === undefined) return <div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;

  if (!editing) {
    return (
      <Card tone={setting ? "default" : "amber"} className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-zinc-600 dark:text-zinc-400">Regular maintenance</p>
          {setting ? (
            <>
              <p className="text-xl font-bold">
                {inr(setting.amount)} {CADENCE_WORDS[setting.cadence]}
              </p>
              <p className="text-base text-zinc-700 dark:text-zinc-300">
                {setting.upi_id ? <>Residents pay by UPI to <span className="font-mono font-semibold">{setting.upi_id}</span></> : "No UPI ID — residents can't pay online yet."}
              </p>
            </>
          ) : (
            <p className="text-lg">Not set up yet. Set the amount once and every flat gets its bill automatically.</p>
          )}
        </div>
        <Button variant={setting ? "secondary" : "accent"} onClick={startEdit}>
          {setting ? "Change" : "Set up now"}
        </Button>
      </Card>
    );
  }

  return (
    <Card tone="indigo">
      <h2 className="mb-1 text-xl font-semibold">Regular maintenance</h2>
      <p className="mb-4 text-base text-zinc-600 dark:text-zinc-400">Only the treasurer can change this. Every flat gets this bill automatically.</p>
      <form onSubmit={save} className="grid gap-4">
        <Field label="Amount for each flat (₹)">
          <Input required type="number" inputMode="numeric" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-base font-medium">How often?</legend>
          <ChoiceGroup name="cadence" columns={3} options={CADENCES} value={form.cadence} onChange={(v) => setForm({ ...form, cadence: v })} />
        </fieldset>
        <Field label="Society UPI ID" optional hint="e.g. society@okhdfc — lets residents pay with any UPI app.">
          <Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} autoCapitalize="none" />
        </Field>
        {error ? <ErrorBanner text={error} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button icon="check" busy={saving} busyText="Saving…">Save</Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function OneOffBill({ society, onAdded }: { society: string; onAdded: () => void }) {
  const [form, setForm] = useState({ flat: "", amount: "", month: thisMonth() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add the bill.");
      setForm({ flat: "", amount: "", month: thisMonth() });
      close();
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the bill.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Add a one-off bill" variant="secondary" className="w-full">
      {(close) => (
        <form onSubmit={(e) => add(e, close)} className="grid gap-4 sm:grid-cols-3">
          <Field label="Flat">
            <Input required value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} placeholder="A-101" />
          </Field>
          <Field label="Amount (₹)">
            <Input required type="number" inputMode="numeric" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="For month">
            <Input required type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          </Field>
          {error ? <div className="sm:col-span-3"><ErrorBanner text={error} /></div> : null}
          <Button icon="check" busy={saving} busyText="Adding…" className="sm:col-span-3 sm:w-fit">
            Add bill
          </Button>
        </form>
      )}
    </AddPanel>
  );
}
