"use client";

import { startTransition, useEffect, useState } from "react";
import { useResident } from "@/components/ResidentShell";
import { Badge, Button, Card, ChoiceGroup, Empty, ErrorBanner, Field, Input, PageHeader, Section, SuccessBanner, Textarea } from "@/components/ui";
import type { HelpTicket, HelpTicketCategory } from "@/lib/cloudflare";
import { statusOf, TICKET_STATUS } from "@/lib/labels";

const KINDS = [
  { value: "feature", label: "An idea for something new" },
  { value: "bug", label: "Something is broken" },
  { value: "feedback", label: "General comment" },
] as const;

type Kind = (typeof KINDS)[number]["value"];

const KIND_LABEL: Record<HelpTicketCategory, string> = { feature: "Idea", bug: "Something broken", feedback: "Comment", help: "Help" };

export default function FeedbackPage() {
  const { society } = useResident();
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [category, setCategory] = useState<Kind>("feature");
  const [form, setForm] = useState({ subject: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = () => {
    fetch("/api/help-tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: HelpTicket[]) => setTickets(rows.filter((t) => t.category !== "help")))
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
        body: JSON.stringify({ ...form, category, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't send.");
      setForm({ subject: "", message: "" });
      setDone("Thank you! Your suggestion has been sent to the VaseraOS team.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader back={{ href: "/me", label: "Back to My account" }} title="Suggest an improvement" subtitle="Want something fixed, changed, or added to the app? Tell the VaseraOS team." />
      {done ? <div className="mb-5"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      <Card>
        <form onSubmit={submit} className="grid gap-4">
          <fieldset>
            <legend className="mb-2 text-base font-medium">What is it?</legend>
            <ChoiceGroup name="kind" options={KINDS} value={category} onChange={setCategory} />
          </fieldset>
          <Field label="In a few words">
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </Field>
          <Field label="Tell us more">
            <Textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </Field>
          {error ? <ErrorBanner text={error} /> : null}
          <Button size="lg" icon="check" busy={saving} busyText="Sending…" className="w-full sm:w-auto">
            Send
          </Button>
        </form>
      </Card>

      <Section title="What I've sent">
        {tickets.length === 0 ? (
          <Empty text="Nothing sent yet." />
        ) : (
          <div className="grid gap-3">
            {tickets.map((t) => {
              const s = statusOf(TICKET_STATUS, t.status);
              return (
                <Card key={t.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{t.subject}</p>
                    <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">{t.message}</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{KIND_LABEL[t.category]}</p>
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
