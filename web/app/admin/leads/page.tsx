"use client";

import { startTransition, useEffect, useState } from "react";
import { Card, Empty, ErrorBanner, ListSkeleton, PageHeader } from "@/components/ui";
import type { Lead } from "@/lib/cloudflare";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div>
      <PageHeader title="Leads" subtitle="People who asked about VaseraOS from the landing page." />
      {error ? <div className="mb-4"><ErrorBanner text={error} onRetry={load} /></div> : null}
      {loading ? (
        <ListSkeleton />
      ) : leads.length === 0 ? (
        <Empty text="No leads yet." />
      ) : (
        <div className="grid gap-3">
          {leads.map((l) => (
            <Card key={l.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{l.name}</p>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
