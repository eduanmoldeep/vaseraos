"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Visitor } from "@/lib/cloudflare";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";

export default function VisitorsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Visitor[]>([]);
  const [form, setForm] = useState({ name: "", flat: "", purpose: "Guest" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/visitors?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load visitors."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/visitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, society_id: getSelectedSociety() }) });
      setForm({ name: "", flat: "", purpose: "Guest" });
      load();
    } catch {
      setError("Couldn't pre-approve visitor. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/visitors", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this visitor log?")) return;
    await fetch(`/api/visitors?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Visitors" subtitle="Gate log — expected → checked in → checked out." />
        <div className="mt-4"><NeedsSociety label="visitors" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Visitors" subtitle="Gate log — expected → checked in → checked out." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <Input required placeholder="Visitor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required placeholder="Flat to visit" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} />
          <Select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
            <option value="Guest">Guest</option>
            <option value="Delivery">Delivery</option>
            <option value="HouseHelp">HouseHelp</option>
            <option value="Home Service">Home Service</option>
          </Select>
          <Button busy={saving} busyText="Adding…">Pre-approve</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No visitors logged." />
        ) : (
          rows.map((v) => (
            <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{v.name} <span className="text-zinc-500">→ {v.flat}</span></p>
                <p className="text-xs text-zinc-500">{v.purpose}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={v.status === "checked_in" ? "green" : v.status === "checked_out" ? "zinc" : "blue"}>{v.status.replace("_", " ")}</Badge>
                <Select
                  value={v.status}
                  onChange={(e) => setStatus(v.id, e.target.value)}
                  className="w-auto px-2 py-1 text-xs"
                  aria-label={`Visitor status for ${v.name}`}
                >
                  <option value="expected">expected</option>
                  <option value="checked_in">checked in</option>
                  <option value="checked_out">checked out</option>
                </Select>
                <Button variant="danger" size="sm" onClick={() => remove(v.id)} aria-label={`Delete visitor ${v.name}`}>
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
