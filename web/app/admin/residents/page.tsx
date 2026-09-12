"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Resident } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function ResidentsPage() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [rows, setRows] = useState<Resident[]>([]);
  const [form, setForm] = useState({ name: "", flat: "", phone: "", owner_tenant: "tenant" as "owner" | "tenant" });
  const [loading, setLoading] = useState(() => !!getSelectedSociety());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/residents?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load residents."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/residents?society=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data) setRows(data); })
        .catch(() => setError("Couldn't load residents."))
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
      await fetch("/api/residents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: getSelectedSociety() }),
      });
      setForm({ name: "", flat: "", phone: "", owner_tenant: "tenant" });
      load();
    } catch {
      setError("Couldn't add resident. Try again.");
    } finally {
      setSaving(false);
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
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
                <p className="text-xs text-zinc-500">{r.phone} · {r.members} members</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={r.owner_tenant === "owner" ? "blue" : "amber"}>{r.owner_tenant === "owner" ? "Flat owner" : "Tenant"}</Badge>
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
