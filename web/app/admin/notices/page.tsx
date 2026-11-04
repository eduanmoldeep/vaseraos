"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Button, Card, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader, SuccessBanner, Textarea } from "@/components/ui";
import type { Notice } from "@/lib/cloudflare";
import { formatDate } from "@/lib/labels";
import { useSelectedSociety } from "@/lib/society";

export default function NoticesPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<(Notice & { created_at?: string })[] | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    fetch(`/api/notices?society=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError("Couldn't load notices."));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function remove(n: Notice) {
    if (!confirm(`Delete the notice “${n.title}”? Residents will no longer see it.`)) return;
    await fetch(`/api/notices?id=${n.id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Notices" />
        <NeedsSociety label="notices" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements every resident sees in the app." />

      <PostNotice society={society} onPosted={() => { setDone("Notice posted. Residents with alerts turned on have been notified."); load(); }} />

      {done ? <div className="mt-4"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      <div className="mt-6 grid gap-3">
        {rows === null ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No notices yet." hint="Post the first one with the button above." />
        ) : (
          rows.map((n) => (
            <Card key={n.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{n.title}</p>
                  {n.created_at ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatDate(n.created_at)}</p> : null}
                </div>
                <Button variant="danger" size="sm" onClick={() => remove(n)}>
                  Delete
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-line text-base text-zinc-800 dark:text-zinc-200">{n.body}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function PostNotice({ society, onPosted }: { society: string; onPosted: () => void }) {
  const [form, setForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function post(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(res.status === 403 ? "Only the society president can post notices." : data?.error ?? "Couldn't post the notice.");
      setForm({ title: "", body: "" });
      close();
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post the notice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Post a notice" icon="megaphone">
      {(close) => (
        <form onSubmit={(e) => post(e, close)} className="grid gap-4">
          <Field label="Heading" hint="Short and clear, e.g. “Water supply off on Sunday”.">
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </Field>
          <Field label="Message">
            <Textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Everyone in the society will see this. Only the president can post.</p>
          {error ? <ErrorBanner text={error} /> : null}
          <Button icon="megaphone" busy={saving} busyText="Posting…" className="sm:w-fit">
            Post notice
          </Button>
        </form>
      )}
    </AddPanel>
  );
}
