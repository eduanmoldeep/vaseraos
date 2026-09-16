"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Bill, Cadence, MaintenanceSetting } from "@/lib/cloudflare";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";

const CADENCE_LABEL: Record<Cadence, string> = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

export default function MaintenancePage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Bill[]>([]);
  const [setting, setSetting] = useState<MaintenanceSetting | null>(null);
  const [settingForm, setSettingForm] = useState({ amount: "", cadence: "monthly" as Cadence, upi_id: "" });
  const [settingError, setSettingError] = useState("");
  const [savingSetting, setSavingSetting] = useState(false);
  const [form, setForm] = useState({ flat: "", amount: "", month: "2026-09" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState<Record<string, File | null>>({});

  const loadSetting = (id: string | null) => {
    if (!id) { setSetting(null); return; }
    fetch(`/api/maintenance/settings?society=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MaintenanceSetting | null) => {
        setSetting(data ?? null);
        if (data) setSettingForm({ amount: String(data.amount), cadence: data.cadence, upi_id: data.upi_id ?? "" });
      })
      .catch(() => {});
  };

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
    startTransition(() => { load(society); loadSetting(society); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function saveSetting(e: React.FormEvent) {
    e.preventDefault();
    setSavingSetting(true);
    setSettingError("");
    try {
      const res = await fetch("/api/maintenance/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: Number(settingForm.amount), cadence: settingForm.cadence, upi_id: settingForm.upi_id, society_id: getSelectedSociety() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setSettingError(data?.error ?? "Couldn't save maintenance settings."); return; }
      setSetting(data);
      load();
    } catch {
      setSettingError("Couldn't save maintenance settings.");
    } finally {
      setSavingSetting(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), society_id: getSelectedSociety() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't raise bill."); return; }
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

  async function markPaid(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", "paid");
    const file = receiptFiles[id];
    if (file) fd.set("receipt", file);
    await fetch("/api/bills", { method: "PATCH", body: fd });
    setReceiptFiles((r) => ({ ...r, [id]: null }));
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
        <p className="text-sm font-medium">Recurring due (treasurer)</p>
        <p className="mt-1 text-xs text-zinc-500">
          {setting
            ? `₹${setting.amount.toLocaleString("en-IN")} due every ${CADENCE_LABEL[setting.cadence].toLowerCase()} period — raised automatically for every flat.`
            : "Not configured yet — every flat's due appears automatically once set."}
        </p>
        <form onSubmit={saveSetting} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input required type="number" min="1" placeholder="Amount ₹" value={settingForm.amount} onChange={(e) => setSettingForm({ ...settingForm, amount: e.target.value })} />
          <Select value={settingForm.cadence} onChange={(e) => setSettingForm({ ...settingForm, cadence: e.target.value as Cadence })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Input
            placeholder="UPI ID (e.g. society@bank) — optional, lets residents pay by QR"
            value={settingForm.upi_id}
            onChange={(e) => setSettingForm({ ...settingForm, upi_id: e.target.value })}
            className="sm:col-span-2"
          />
          <Button busy={savingSetting} busyText="Saving…" className="w-fit">Save</Button>
        </form>
        {settingError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{settingError}</p> : null}
      </Card>

      <Card className="mt-4">
        <p className="text-sm font-medium">One-off bill (treasurer)</p>
        <form onSubmit={add} className="mt-3 grid gap-3 sm:grid-cols-4">
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
                <Badge tone={b.status === "paid" ? "green" : b.status === "pending_verification" ? "blue" : b.status === "overdue" ? "red" : "amber"}>
                  {b.status === "pending_verification" ? "awaiting approval" : b.status}
                </Badge>
                {b.status === "pending_verification" ? (
                  <>
                    {b.receipt_key ? (
                      <a href={`/api/uploads/${b.receipt_key}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        View screenshot
                      </a>
                    ) : null}
                    <Button variant="secondary" size="sm" onClick={() => setStatus(b.id, "pending")}>Reject</Button>
                    <Button size="sm" onClick={() => setStatus(b.id, "paid")}>Approve</Button>
                  </>
                ) : b.status === "paid" ? (
                  <>
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
                    {b.receipt_key ? (
                      <a href={`/api/uploads/${b.receipt_key}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        Receipt
                      </a>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Select
                      value={b.status}
                      onChange={(e) => setStatus(b.id, e.target.value)}
                      className="w-auto px-2 py-1 text-xs"
                      aria-label={`Bill status for ${b.flat} ${b.month}`}
                    >
                      <option value="pending">pending</option>
                      <option value="overdue">overdue</option>
                    </Select>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      aria-label={`Payment receipt for ${b.flat} ${b.month}`}
                      onChange={(e) => setReceiptFiles((r) => ({ ...r, [b.id]: e.target.files?.[0] ?? null }))}
                      className="w-32 text-xs text-zinc-500 file:mr-1 file:rounded file:border-0 file:bg-zinc-100 file:px-1.5 file:py-0.5 file:text-xs dark:file:bg-zinc-800"
                    />
                    <Button size="sm" onClick={() => markPaid(b.id)}>Mark paid</Button>
                  </>
                )}
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
