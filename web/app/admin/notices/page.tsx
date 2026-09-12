"use client";

import { startTransition, useEffect, useState } from "react";
import { Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader, Textarea } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Notice } from "@/lib/cloudflare";
import { getSelectedSociety, useSelectedSociety } from "@/lib/society";

export default function NoticesPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Notice[]>([]);
  const [form, setForm] = useState({ title: "", body: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/notices?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load notices."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/notices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: getSelectedSociety() }),
      });
      setForm({ title: "", body: "" });
      load();
    } catch {
      setError("Couldn't publish notice. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this notice?")) return;
    await fetch(`/api/notices?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Notices" subtitle="Announcements with optional file attachments." />
        <div className="mt-4"><NeedsSociety label="notices" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements with optional file attachments." />
      <Card>
        <form onSubmit={add} className="grid gap-3">
          <Input required placeholder="Notice title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea required placeholder="Notice body…" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Button className="w-fit" busy={saving} busyText="Publishing…">Publish notice</Button>
        </form>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No notices yet." />
        ) : (
          rows.map((n) => (
            <Card key={n.id} className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{n.body}</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => remove(n.id)} aria-label={`Delete notice ${n.title}`}>
                Delete
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
