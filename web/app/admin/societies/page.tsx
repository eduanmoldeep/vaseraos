"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { Badge, Button, Card, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader } from "@/components/ui";
import { inr } from "@/lib/labels";
import { ShareJoinCode } from "@/components/ShareJoinCode";
import type { Society } from "@/lib/cloudflare";
import { setSelectedSociety, useSelectedSociety } from "@/lib/society";

type Counts = Record<string, { residents: number; dues: number; openComplaints: number; activeVisitors: number }>;

export default function SocietiesPage() {
  const [rows, setRows] = useState<Society[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const current = useSelectedSociety();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/societies")
      .then((r) => r.json())
      .then(async (list: Society[]) => {
        setRows(list);
        const entries = await Promise.all(
          list
            .filter((s) => s.status === "approved")
            .map(async (s) => {
              try {
                const r = await fetch(`/api/summary?society=${s.id}`).then((x) => x.json());
                return [s.id, r] as const;
              } catch {
                return [s.id, { residents: 0, dues: 0, openComplaints: 0, activeVisitors: 0 }] as const;
              }
            })
        );
        setCounts(Object.fromEntries(entries));
      })
      .catch(() => setError("Couldn't load societies."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(() => load());
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsPlatformAdmin(!!d?.user?.admin))
      .catch(() => {});
  }, []);

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/societies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json().catch(() => null);
      if (!res.ok) throw new Error(created?.error ?? "Couldn't add society.");
      setForm({ name: "", city: "" });
      close();
      if (created?.id) {
        setSelectedSociety(created.id);
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add society.");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await fetch("/api/societies", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" and ALL its residents, bills, complaints, visitors and notices?`)) return;
    await fetch(`/api/societies?id=${id}`, { method: "DELETE" });
    if (current === id) {
      setSelectedSociety(null);
    }
    load();
  }

  function select(id: string) {
    setSelectedSociety(id);
  }

  const pending = rows.filter((s) => s.status === "pending");
  const approved = rows.filter((s) => s.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Societies"
        subtitle={
          isPlatformAdmin
            ? "Every tenant, isolated: its own residents, bills, tickets, visitors and notices."
            : "The societies you administer."
        }
      />
      {isPlatformAdmin ? (
        <AddPanel label="Add a society" icon="building">
          {(close) => (
            <form onSubmit={(e) => add(e, close)} className="grid gap-4 sm:grid-cols-2">
              <Field label="Society name" hint="e.g. Greenview Heights">
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              </Field>
              <Field label="City" optional>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Button icon="check" busy={saving} busyText="Adding…" className="sm:col-span-2 sm:w-fit">Add society</Button>
            </form>
          )}
        </AddPanel>
      ) : null}

      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={load} /></div> : null}

      {isPlatformAdmin && pending.length > 0 ? (
        <div className="mt-4">
          <h2 className="mb-3 text-xl font-semibold">Waiting for approval</h2>
          <div className="grid gap-3">
            {pending.map((s) => (
              <Card key={s.id} tone="amber" className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{s.name}</p>
                  <p className="text-base text-zinc-700 dark:text-zinc-300">{s.city || "City not given"} · asked to join VaseraOS</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button icon="check" busy={busyId === s.id} onClick={() => decide(s.id, "approve")}>
                    Approve
                  </Button>
                  <Button variant="danger" busy={busyId === s.id} onClick={() => { if (confirm(`Reject “${s.name}”?`)) decide(s.id, "reject"); }}>
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : approved.length === 0 ? (
          <Empty text="No societies yet." />
        ) : (
          approved.map((s) => {
            const c = counts[s.id];
            return (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                    {s.name}
                    {s.id === current ? <Badge tone="green">Currently open</Badge> : null}
                  </p>
                  <p className="text-base text-zinc-600 dark:text-zinc-400">
                    {s.city || "City not given"}
                    {c ? ` · ${c.residents} residents · ${inr(c.dues)} unpaid · ${c.openComplaints} open complaints` : ""}
                  </p>
                  {s.join_code ? (
                    <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                      Invite code: <span className="font-mono font-bold text-zinc-950 dark:text-white">{s.join_code}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isPlatformAdmin && !s.join_code ? (
                    <Button variant="secondary" size="sm" busy={busyId === s.id} onClick={() => decide(s.id, "approve")}>
                      Generate join code
                    </Button>
                  ) : null}
                  {s.join_code ? <ShareJoinCode societyName={s.name} joinCode={s.join_code} size="sm" /> : null}
                  {s.id !== current ? (
                    <Button variant="secondary" size="sm" onClick={() => select(s.id)}>
                      Open this society
                    </Button>
                  ) : null}
                  <Button variant="danger" size="sm" onClick={() => remove(s.id, s.name)} aria-label={`Delete society ${s.name}`}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
