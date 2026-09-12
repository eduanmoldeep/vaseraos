"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";
import type { Guard } from "@/lib/cloudflare";

export default function GuardsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/guards?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load guards."))
      .finally(() => setLoading(false));
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
            <Card key={g.id} className="flex flex-wrap items-center justify-between gap-3">
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
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
