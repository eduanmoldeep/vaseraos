"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Select } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Complaint } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function ComplaintsPage() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [rows, setRows] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ flat: "", title: "", category: "general" });
  const [loading, setLoading] = useState(() => !!getSelectedSociety());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/complaints?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load complaints."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/complaints?society=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data) setRows(data); })
        .catch(() => setError("Couldn't load complaints."))
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
      await fetch("/api/complaints", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, society_id: getSelectedSociety() }) });
      setForm({ flat: "", title: "", category: "general" });
      load();
    } catch {
      setError("Couldn't raise ticket. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/complaints", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this complaint?")) return;
    await fetch(`/api/complaints?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Complaints" subtitle="Track tickets from open to resolved." />
        <div className="mt-4"><NeedsSociety label="complaints" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Track tickets from open to resolved." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <Input required placeholder="Flat" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} />
          <Input required placeholder="Issue title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="general">General</option>
            <option value="maintenance">Maintenance</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="security">Security</option>
          </Select>
          <Button busy={saving} busyText="Raising…">Raise ticket</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No complaints." />
        ) : (
          rows.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-zinc-500">{c.flat} · {c.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={c.status === "resolved" ? "green" : c.status === "in_progress" ? "blue" : "amber"}>{c.status.replace("_", " ")}</Badge>
                <Select
                  value={c.status}
                  onChange={(e) => setStatus(c.id, e.target.value)}
                  className="w-auto px-2 py-1 text-xs"
                  aria-label={`Complaint status for ${c.title}`}
                >
                  <option value="open">open</option>
                  <option value="in_progress">in progress</option>
                  <option value="resolved">resolved</option>
                </Select>
                <Button variant="danger" size="sm" onClick={() => remove(c.id)} aria-label={`Delete complaint ${c.title}`}>
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
