"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Office, Resident } from "@/lib/cloudflare";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";

const OFFICES: { value: Office; label: string; tone: "blue" | "green" | "amber" }[] = [
  { value: "president", label: "President", tone: "blue" },
  { value: "secretary", label: "Secretary", tone: "green" },
  { value: "treasurer", label: "Treasurer", tone: "amber" },
];

export default function ResidentsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Resident[]>([]);
  const [offices, setOffices] = useState<Record<string, Office[]>>({});
  const [form, setForm] = useState({ name: "", email: "", flat: "", phone: "", owner_tenant: "tenant" as "owner" | "tenant" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingOfficeKey, setSavingOfficeKey] = useState<string | null>(null);
  const [savingOwnerId, setSavingOwnerId] = useState<string | null>(null);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setOffices({}); setLoading(false); return; }
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/residents?society=${id}`).then((r) => r.json()),
      fetch(`/api/societies/offices?society=${id}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([residentRows, officeRows]: [Resident[], { userId: string; offices: Office[] }[]]) => {
        setRows(residentRows ?? []);
        setOffices(Object.fromEntries((officeRows ?? []).map((o) => [o.userId, o.offices])));
      })
      .catch(() => setError("Couldn't load residents."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function toggleOffice(userId: string, office: Office) {
    const current = offices[userId] ?? [];
    const next = current.includes(office) ? current.filter((o) => o !== office) : [...current, office];
    const key = `${userId}:${office}`;
    setSavingOfficeKey(key);
    try {
      await fetch("/api/societies/offices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: society, userId, offices: next }),
      });
      setOffices((prev) => ({ ...prev, [userId]: next }));
    } catch {
      setError("Couldn't update that role. Try again.");
    } finally {
      setSavingOfficeKey(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/residents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: getSelectedSociety() }),
      });
      setForm({ name: "", email: "", flat: "", phone: "", owner_tenant: "tenant" });
      load();
    } catch {
      setError("Couldn't add resident. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOwnerTenant(r: Resident) {
    const next = r.owner_tenant === "owner" ? "tenant" : "owner";
    setSavingOwnerId(r.id);
    try {
      await fetch("/api/residents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, owner_tenant: next }),
      });
      setRows((prev) => prev.map((row) => (row.id === r.id ? { ...row, owner_tenant: next } : row)));
    } catch {
      setError("Couldn't update owner/tenant. Try again.");
    } finally {
      setSavingOwnerId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this resident?")) return;
    await fetch(`/api/residents?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Residents" subtitle="Flats, owners, tenants & members." />
        <div className="mt-4"><NeedsSociety label="residents" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Residents" subtitle="Flats, owners, tenants & members." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="email" placeholder="Email (optional — links their account once they sign in)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input required placeholder="Flat (e.g. A-101)" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} />
          <Input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select value={form.owner_tenant} onChange={(e) => setForm({ ...form, owner_tenant: e.target.value as "owner" | "tenant" })}>
            <option value="tenant">Tenant</option>
            <option value="owner">Flat owner</option>
          </Select>
          <Button busy={saving} busyText="Adding…">Add resident</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No residents yet." />
        ) : (
          rows.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.name} <span className="text-zinc-500">· {r.flat}</span></p>
                <p className="text-xs text-zinc-500">{r.phone} · {r.members} members{r.email ? ` · ${r.email}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={savingOwnerId === r.id}
                  onClick={() => toggleOwnerTenant(r)}
                  className="disabled:opacity-50"
                  aria-label={`Change ${r.name} to ${r.owner_tenant === "owner" ? "tenant" : "flat owner"}`}
                >
                  <Badge tone={r.owner_tenant === "owner" ? "blue" : "amber"}>{r.owner_tenant === "owner" ? "Flat owner" : "Tenant"}</Badge>
                </button>
                {r.user_id ? (
                  OFFICES.map((o) => {
                    const active = (offices[r.user_id!] ?? []).includes(o.value);
                    const busy = savingOfficeKey === `${r.user_id}:${o.value}`;
                    return (
                      <button
                        key={o.value}
                        disabled={busy}
                        onClick={() => toggleOffice(r.user_id!, o.value)}
                        className="disabled:opacity-50"
                        aria-pressed={active}
                        aria-label={`${active ? "Remove" : "Assign"} ${o.label} for ${r.name}`}
                      >
                        <Badge tone={active ? o.tone : "zinc"}>{o.label}</Badge>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-zinc-400">Not signed in yet</span>
                )}
                <Button variant="danger" size="sm" onClick={() => remove(r.id)} aria-label={`Remove resident ${r.name}`}>
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
