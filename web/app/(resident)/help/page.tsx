"use client";

import { startTransition, useEffect, useState } from "react";
import { useResident } from "@/components/ResidentShell";
import { Badge, Button, Card, Empty, ErrorBanner, Field, Input, PageHeader, Section, SuccessBanner, Textarea } from "@/components/ui";
import type { HelpTicket } from "@/lib/cloudflare";
import { statusOf, TICKET_STATUS } from "@/lib/labels";

export default function HelpPage() {
  const { society } = useResident();
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = () => {
    fetch("/api/help-tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: HelpTicket[]) => setTickets(rows.filter((t) => t.category === "help")))
      .catch(() => {});
  };
  useEffect(() => {
    startTransition(load);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/help-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't send your message.");
      setForm({ subject: "", message: "" });
      setDone("Your message has been sent. The VaseraOS team will get back to you.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        back={{ href: "/me", label: "Back to My account" }}
        title="Get help"
        subtitle="Can't do something in the app? Tell us and the VaseraOS team will follow up. For problems in your building, use Complaints instead."
      />
      {done ? <div className="mb-5"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      <Card>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="What do you need help with?" hint="A few words, e.g. “Can't upload payment screenshot”.">
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </Field>
          <Field label="Tell us more">
            <Textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </Field>
          {error ? <ErrorBanner text={error} /> : null}
          <Button size="lg" icon="check" busy={saving} busyText="Sending…" className="w-full sm:w-auto">
            Send message
          </Button>
        </form>
      </Card>

      <Section title="My messages">
        {tickets.length === 0 ? (
          <Empty text="You haven't asked for help yet." />
        ) : (
          <div className="grid gap-3">
            {tickets.map((t) => {
              const s = statusOf(TICKET_STATUS, t.status);
              return (
                <Card key={t.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{t.subject}</p>
                    <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">{t.message}</p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
