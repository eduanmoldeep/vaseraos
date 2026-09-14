"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Empty, ErrorBanner, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useSelectedSociety } from "@/lib/society";
import type { HelpTicket, HelpTicketCategory } from "@/lib/cloudflare";

const CATEGORY_LABEL: Record<HelpTicketCategory, string> = {
  feature: "Feature request",
  bug: "Bug report",
  feedback: "General feedback",
  help: "Help",
};

export default function FeedbackPage() {
  const router = useRouter();
  const society = useSelectedSociety();
  const [checked, setChecked] = useState(false);
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [form, setForm] = useState<{ category: HelpTicketCategory; subject: string; message: string }>({
    category: "feature",
    subject: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/help-tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: HelpTicket[]) => setTickets(rows.filter((t) => t.category !== "help")))
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d?.user) { router.replace("/"); return; } load(); })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/help-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't submit."); return; }
      setForm({ category: form.category, subject: "", message: "" });
      load();
    } catch {
      setError("Couldn't submit. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!checked) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Card className="animate-pulse"><div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-900" /></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <PageHeader title="Feature requests & feedback" subtitle="Want something fixed, changed, or added? Tell the VaseraOS team here." />
      <Card>
        <form onSubmit={submit} className="grid gap-3">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as HelpTicketCategory })}>
            <option value="feature">Feature request</option>
            <option value="bug">Bug report</option>
            <option value="feedback">General feedback</option>
          </Select>
          <Input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Textarea required rows={4} placeholder="Describe it…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <Button busy={saving} busyText="Sending…">Submit</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} /></div> : null}

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">Your submissions</p>
        <div className="grid gap-3">
          {tickets.length === 0 ? (
            <Empty text="Nothing submitted yet." />
          ) : (
            tickets.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{t.subject}</p>
                  <p className="mt-1 text-sm text-zinc-500">{t.message}</p>
                  <p className="mt-1 text-xs text-zinc-400">{CATEGORY_LABEL[t.category]}</p>
                </div>
                <Badge tone={t.status === "resolved" ? "green" : "amber"}>{t.status}</Badge>
              </Card>
            ))
          )}
        </div>
      </div>

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back
      </Link>
    </div>
  );
}
