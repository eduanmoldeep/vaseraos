"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Badge, Button, Card, ChoiceGroup, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader, Tabs } from "@/components/ui";
import type { Complaint } from "@/lib/cloudflare";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, labelFor, statusOf } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

type Status = Complaint["status"];
type Category = (typeof COMPLAINT_CATEGORIES)[number]["value"];

/** The one obvious next step for each stage of a complaint. */
const NEXT: Record<Status, { to: Status; label: string; icon: "wrench" | "check" | "chevronLeft" }> = {
  open: { to: "in_progress", label: "Start work on it", icon: "wrench" },
  in_progress: { to: "resolved", label: "Mark as fixed", icon: "check" },
  resolved: { to: "open", label: "Reopen", icon: "chevronLeft" },
};

export default function ComplaintsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Complaint[] | null>(null);
  const [view, setView] = useState<Status>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    fetch(`/api/complaints?society=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError("Couldn't load complaints."));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function move(c: Complaint, to: Status) {
    setBusyId(c.id);
    try {
      const res = await fetch("/api/complaints", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: c.id, status: to }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => (prev ?? []).map((r) => (r.id === c.id ? { ...r, status: to } : r)));
    } catch {
      setError("Couldn't update that complaint. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: Complaint) {
    if (!confirm(`Delete the complaint “${c.title}” from flat ${c.flat}? This can't be undone.`)) return;
    await fetch(`/api/complaints?id=${c.id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Complaints" />
        <NeedsSociety label="complaints" />
      </div>
    );
  }

  const count = (s: Status) => (rows ?? []).filter((c) => c.status === s).length;
  const listed = (rows ?? []).filter((c) => c.status === view);

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Problems reported by residents — move each one along until it's fixed." />

      <AddComplaint society={society} onAdded={() => { setView("open"); load(); }} />

      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <div className="mt-6">
        <Tabs<Status>
          label="Show complaints"
          value={view}
          onChange={setView}
          tabs={[
            { id: "open", label: "New", count: count("open") },
            { id: "in_progress", label: "Being fixed", count: count("in_progress") },
            { id: "resolved", label: "Fixed", count: count("resolved") },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {rows === null ? (
          <ListSkeleton />
        ) : listed.length === 0 ? (
          <Empty text={view === "open" ? "No new complaints." : view === "in_progress" ? "Nothing is being worked on right now." : "No fixed complaints yet."} />
        ) : (
          listed.map((c) => {
            const s = statusOf(COMPLAINT_STATUS, c.status);
            const next = NEXT[c.status];
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{c.title}</p>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">
                      Flat {c.flat} · {labelFor(COMPLAINT_CATEGORIES, c.category)}
                    </p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant={c.status === "resolved" ? "secondary" : "primary"} icon={next.icon} busy={busyId === c.id} busyText="Saving…" onClick={() => move(c, next.to)}>
                    {next.label}
                  </Button>
                  {c.status === "in_progress" ? (
                    <Button variant="ghost" size="sm" onClick={() => move(c, "open")}>
                      Move back to new
                    </Button>
                  ) : null}
                  <Button variant="danger" size="sm" onClick={() => remove(c)} className="ml-auto">
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

function AddComplaint({ society, onAdded }: { society: string; onAdded: () => void }) {
  const [form, setForm] = useState({ flat: "", title: "", category: "general" as Category });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't log the complaint.");
      setForm({ flat: "", title: "", category: "general" });
      close();
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log the complaint.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Log a complaint for a resident" variant="secondary">
      {(close) => (
        <form onSubmit={(e) => add(e, close)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Flat">
              <Input required value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} placeholder="A-101" />
            </Field>
            <Field label="What is the problem?">
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-base font-medium">Kind of problem</legend>
            <ChoiceGroup name="admin_category" columns={3} options={COMPLAINT_CATEGORIES} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          </fieldset>
          {error ? <ErrorBanner text={error} /> : null}
          <Button icon="check" busy={saving} busyText="Saving…" className="sm:w-fit">
            Log complaint
          </Button>
        </form>
      )}
    </AddPanel>
  );
}
