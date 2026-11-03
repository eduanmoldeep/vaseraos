"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Badge, Button, Card, ChoiceGroup, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader, Tabs } from "@/components/ui";
import type { Visitor } from "@/lib/cloudflare";
import { labelFor, statusOf, VISITOR_PURPOSES, VISITOR_STATUS } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

type Status = Visitor["status"];
type Purpose = (typeof VISITOR_PURPOSES)[number]["value"];

export default function VisitorsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Visitor[] | null>(null);
  const [view, setView] = useState<Status>("expected");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    fetch(`/api/visitors?society=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError("Couldn't load visitors."));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function move(v: Visitor, to: Status) {
    setBusyId(v.id);
    try {
      const res = await fetch("/api/visitors", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: v.id, status: to }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => (prev ?? []).map((r) => (r.id === v.id ? { ...r, status: to } : r)));
    } catch {
      setError("Couldn't update that visitor. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(v: Visitor) {
    if (!confirm(`Delete the visitor entry for ${v.name}?`)) return;
    await fetch(`/api/visitors?id=${v.id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Visitors" />
        <NeedsSociety label="visitors" />
      </div>
    );
  }

  const count = (s: Status) => (rows ?? []).filter((v) => v.status === s).length;
  const listed = (rows ?? []).filter((v) => v.status === view);

  return (
    <div>
      <PageHeader title="Visitors" subtitle="Who is expected, who is inside, and who has left." />

      <AddVisitor society={society} onAdded={() => { setView("expected"); load(); }} />

      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <div className="mt-6">
        <Tabs<Status>
          label="Show visitors"
          value={view}
          onChange={setView}
          tabs={[
            { id: "expected", label: "Expected", count: count("expected") },
            { id: "checked_in", label: "Inside", count: count("checked_in") },
            { id: "checked_out", label: "Left", count: count("checked_out") },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {rows === null ? (
          <ListSkeleton />
        ) : listed.length === 0 ? (
          <Empty text={view === "expected" ? "No one is expected." : view === "checked_in" ? "No visitors inside right now." : "No one has left yet."} />
        ) : (
          listed.map((v) => {
            const s = statusOf(VISITOR_STATUS, v.status);
            return (
              <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{v.name}</p>
                  <p className="text-base text-zinc-600 dark:text-zinc-400">
                    Visiting flat {v.flat} · {labelFor(VISITOR_PURPOSES, v.purpose)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  {v.status === "expected" ? (
                    <Button icon="userCheck" busy={busyId === v.id} busyText="Saving…" onClick={() => move(v, "checked_in")}>
                      Let in
                    </Button>
                  ) : v.status === "checked_in" ? (
                    <Button variant="secondary" icon="logout" busy={busyId === v.id} busyText="Saving…" onClick={() => move(v, "checked_out")}>
                      Has left
                    </Button>
                  ) : null}
                  <Button variant="danger" size="sm" onClick={() => remove(v)}>
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

function AddVisitor({ society, onAdded }: { society: string; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", flat: "", purpose: "Guest" as Purpose });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      if (!res.ok) throw new Error();
      setForm({ name: "", flat: "", purpose: "Guest" });
      close();
      onAdded();
    } catch {
      setError("Couldn't add the visitor. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Add an expected visitor" variant="secondary">
      {(close) => (
        <form onSubmit={(e) => add(e, close)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visitor's name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Flat they are visiting">
              <Input required value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} placeholder="A-101" />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-base font-medium">Reason for visit</legend>
            <ChoiceGroup name="admin_purpose" options={VISITOR_PURPOSES} value={form.purpose} onChange={(v) => setForm({ ...form, purpose: v })} />
          </fieldset>
          {error ? <ErrorBanner text={error} /> : null}
          <Button icon="check" busy={saving} busyText="Saving…" className="sm:w-fit">
            Add visitor
          </Button>
        </form>
      )}
    </AddPanel>
  );
}
