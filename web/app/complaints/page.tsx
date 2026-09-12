"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Empty, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { useSelectedSociety } from "@/lib/society";

type Complaint = { id: string; flat: string; title: string; category: string; status: "open" | "in_progress" | "resolved" };

export default function MyComplaintsPage() {
  const router = useRouter();
  const society = useSelectedSociety();
  const [checked, setChecked] = useState(false);
  const [myFlat, setMyFlat] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ title: "", category: "general" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d?.user) router.replace("/"); })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const load = () => {
    if (!society) { setComplaints([]); setMyFlat(null); return; }
    fetch(`/api/me/flat?society=${society}`).then((r) => r.json()).then((d) => setMyFlat(d?.flat ?? null)).catch(() => {});
    fetch(`/api/complaints?society=${society}&mine=1`).then((r) => (r.ok ? r.json() : [])).then(setComplaints).catch(() => {});
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!society) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't raise complaint."); return; }
      setForm({ title: "", category: "general" });
      load();
    } catch {
      setError("Couldn't raise complaint. Try again.");
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
      <PageHeader title="My complaints" subtitle="Only your own tickets — raised for your flat, tracked here." />
      <Card>
        {myFlat ? (
          <form onSubmit={submit} className="grid gap-3">
            <p className="text-xs text-zinc-500">Raising for flat <span className="font-medium text-zinc-700 dark:text-zinc-300">{myFlat}</span></p>
            <Input required placeholder="What's the issue?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="security">Security</option>
            </Select>
            <Button busy={saving} busyText="Raising…">Raise complaint</Button>
          </form>
        ) : (
          <p className="text-sm text-zinc-500">
            Your account isn&apos;t linked to a flat yet — ask your society admin to add you as a resident using this account&apos;s email.
          </p>
        )}
      </Card>
      {error ? <div className="mt-4"><ErrorBanner text={error} /></div> : null}

      <div className="mt-6 grid gap-3">
        {complaints.length === 0 ? (
          <Empty text="No complaints raised yet." />
        ) : (
          complaints.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-zinc-500">{c.flat} · {c.category}</p>
              </div>
              <Badge tone={c.status === "resolved" ? "green" : c.status === "in_progress" ? "blue" : "amber"}>{c.status.replace("_", " ")}</Badge>
            </Card>
          ))
        )}
      </div>

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back
      </Link>
    </div>
  );
}
