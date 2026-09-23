"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, ListSkeleton, PageHeader } from "@/components/ui";
import type { Lead, LeadStatus } from "@/lib/cloudflare";

const STATUSES: { value: LeadStatus; label: string; tone: "zinc" | "green" | "amber" | "red" | "blue" }[] = [
  { value: "new", label: "New", tone: "blue" },
  { value: "follow_up", label: "Follow up", tone: "amber" },
  { value: "wip", label: "WIP", tone: "zinc" },
  { value: "closed_won", label: "Closed Won", tone: "green" },
  { value: "closed_lost", label: "Closed Lost", tone: "red" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLeads)
      .catch(() => setError("Couldn't load leads."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(load);
  }, []);

  async function setStatus(id: string, status: LeadStatus) {
    setSavingId(id);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch {
      setError("Couldn't update that lead.");
    } finally {
      setSavingId(null);
    }
  }

  const count = (s: LeadStatus) => leads.filter((l) => (l.status ?? "new") === s).length;
  const shown = filter === "all" ? leads : leads.filter((l) => (l.status ?? "new") === filter);

  return (
    <div>
      <PageHeader title="Leads" subtitle="People who asked about VaseraOS from the landing page." />
      {error ? <div className="mb-4"><ErrorBanner text={error} onRetry={load} /></div> : null}
      {loading ? (
        <ListSkeleton />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[{ value: "all" as const, label: "All", n: leads.length }, ...STATUSES.map((s) => ({ ...s, n: count(s.value) }))].map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  filter === c.value
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                }`}
              >
                <p className="text-xs text-zinc-500">{c.label}</p>
                <p className="text-lg font-semibold">{c.n}</p>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <Empty text={leads.length === 0 ? "No leads yet." : "No leads in this status."} />
          ) : (
            <div className="grid gap-3">
              {shown.map((l) => {
                const status = l.status ?? "new";
                const meta = STATUSES.find((s) => s.value === status)!;
                const closed = status === "closed_won" || status === "closed_lost";
                return (
                  <Card key={l.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{l.name}</p>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-500">
                          <a href={`tel:${l.phone}`} className="underline">{l.phone}</a>
                          {l.email ? <> · <a href={`mailto:${l.email}`} className="underline">{l.email}</a></> : null}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">{new Date(l.created_at.includes("T") ? l.created_at : l.created_at.replace(" ", "T") + "Z").toLocaleString()}</p>
                    </div>
                    {l.society_name || l.city || l.units ? (
                      <p className="mt-2 text-sm">
                        {[l.society_name, l.city, l.units ? `${l.units} flats` : null].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {l.message ? <p className="mt-1 text-sm text-zinc-500">{l.message}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {STATUSES.filter((s) => !s.value.startsWith("closed")).map((s) => (
                        <button
                          key={s.value}
                          disabled={savingId === l.id || status === s.value}
                          onClick={() => setStatus(l.id, s.value)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition disabled:cursor-default ${
                            status === s.value
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black"
                              : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                      <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                      <Button size="sm" variant={status === "closed_won" ? "accent" : "ghost"} disabled={savingId === l.id || status === "closed_won"} onClick={() => setStatus(l.id, "closed_won")}>
                        Closed Won
                      </Button>
                      <Button size="sm" variant="ghost" disabled={savingId === l.id || status === "closed_lost"} onClick={() => setStatus(l.id, "closed_lost")}>
                        Closed Lost
                      </Button>
                      {closed ? (
                        <Button size="sm" variant="ghost" disabled={savingId === l.id} onClick={() => setStatus(l.id, "follow_up")}>
                          Reopen
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
