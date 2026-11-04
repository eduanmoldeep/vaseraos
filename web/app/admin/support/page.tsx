"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBanner, ListSkeleton, PageHeader } from "@/components/ui";
import type { HelpTicket, HelpTicketCategory } from "@/lib/cloudflare";

const CATEGORY_TONE: Record<HelpTicketCategory, "zinc" | "red" | "blue" | "amber"> = {
  help: "zinc",
  bug: "red",
  feature: "blue",
  feedback: "amber",
};
const CATEGORY_LABEL: Record<HelpTicketCategory, string> = {
  help: "Help",
  bug: "Bug",
  feature: "Feature",
  feedback: "Feedback",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/help-tickets")
      .then((r) => r.json())
      .then(setTickets)
      .catch(() => setError("Couldn't load tickets."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(load);
  }, []);

  async function setStatus(id: string, status: "open" | "resolved") {
    setSavingId(id);
    try {
      await fetch("/api/help-tickets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      load();
    } finally {
      setSavingId(null);
    }
  }

  const open = tickets.filter((t) => t.status === "open");
  const resolved = tickets.filter((t) => t.status === "resolved");

  return (
    <div>
      <PageHeader title="Support" subtitle="Help tickets raised by any signed-in user, across every society." />
      {error ? <div className="mb-4"><ErrorBanner text={error} onRetry={load} /></div> : null}
      {loading ? (
        <ListSkeleton />
      ) : (
        <>
          <h2 className="mb-3 text-xl font-semibold">Waiting for reply ({open.length})</h2>
          <div className="grid gap-3">
            {open.length === 0 ? (
              <Empty text="No open tickets." />
            ) : (
              open.map((t) => (
                <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{t.subject}</p>
                      <Badge tone={CATEGORY_TONE[t.category]}>{CATEGORY_LABEL[t.category]}</Badge>
                    </div>
                    <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">{t.message}</p>
                  </div>
                  <Button icon="check" busy={savingId === t.id} onClick={() => setStatus(t.id, "resolved")}>
                    Mark resolved
                  </Button>
                </Card>
              ))
            )}
          </div>

          {resolved.length > 0 ? (
            <>
              <h2 className="mb-3 mt-8 text-xl font-semibold">Resolved ({resolved.length})</h2>
              <div className="grid gap-3">
                {resolved.map((t) => (
                  <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 opacity-80">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold">{t.subject}</p>
                        <Badge tone={CATEGORY_TONE[t.category]}>{CATEGORY_LABEL[t.category]}</Badge>
                      </div>
                      <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">{t.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="green">resolved</Badge>
                      <Button variant="secondary" size="sm" busy={savingId === t.id} onClick={() => setStatus(t.id, "open")}>
                        Reopen
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
