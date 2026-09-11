"use client";

import { useEffect, useState } from "react";
import { Card, Empty, PageHeader } from "@/components/ui";
import type { Notice } from "@/lib/cloudflare";

export default function NoticesPage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [form, setForm] = useState({ title: "", body: "" });

  const load = () => fetch("/api/notices").then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/notices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setForm({ title: "", body: "" });
    load();
  }

  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements in D1; file attachments go to the UPLOADS R2 bucket." />
      <Card>
        <form onSubmit={add} className="grid gap-3">
          <input required placeholder="Notice title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <textarea required placeholder="Notice body…" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="w-fit rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Publish notice</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No notices yet." /> : rows.map((n) => (
          <Card key={n.id}>
            <p className="font-medium">{n.title}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{n.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
