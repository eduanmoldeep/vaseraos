"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Empty, ErrorBanner, Input, PageHeader, Textarea } from "@/components/ui";
import { getSelectedSociety } from "@/lib/society";
import type { HelpTicket } from "@/lib/cloudflare";

export default function HelpPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/help-tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTickets)
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
        body: JSON.stringify({ ...form, society_id: getSelectedSociety() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't submit ticket."); return; }
      setForm({ subject: "", message: "" });
      load();
    } catch {
      setError("Couldn't submit ticket. Try again.");
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
      <PageHeader title="Help" subtitle="Can't do something in the app, or a role needs fixing? Raise it here — the VaseraOS team will follow up." />
      <Card>
        <form onSubmit={submit} className="grid gap-3">
          <Input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Textarea required rows={4} placeholder="Describe what you need help with…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <Button busy={saving} busyText="Sending…">Raise ticket</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} /></div> : null}

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">Your tickets</p>
        <div className="grid gap-3">
          {tickets.length === 0 ? (
            <Empty text="No tickets raised yet." />
          ) : (
            tickets.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{t.subject}</p>
                  <p className="mt-1 text-sm text-zinc-500">{t.message}</p>
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
