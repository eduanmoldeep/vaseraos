"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { useSelectedSociety } from "@/lib/society";
import type { Resident } from "@/lib/cloudflare";

export default function MyInfoPage() {
  const router = useRouter();
  const society = useSelectedSociety();
  const [checked, setChecked] = useState(false);
  const [resident, setResident] = useState<Resident | null | undefined>(undefined); // undefined = not loaded yet
  const [linkForm, setLinkForm] = useState({ flat: "", phone: "", owner_tenant: "tenant" as "owner" | "tenant" });
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d?.user) router.replace("/"); })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const load = () => {
    if (!society) { setResident(undefined); return; }
    fetch(`/api/me/resident?society=${society}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Resident | null) => {
        setResident(d);
        if (d) setEditForm({ name: d.name, phone: d.phone });
      })
      .catch(() => setResident(null));
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!society) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/me/resident", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...linkForm, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't link your flat."); return; }
      setResident(data);
      setEditForm({ name: data.name, phone: data.phone });
    } catch {
      setError("Couldn't link your flat. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!society) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/me/resident", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...editForm, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't save your details."); return; }
      setResident(data);
      setSuccess("Saved.");
    } catch {
      setError("Couldn't save your details. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!checked || resident === undefined) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Card className="animate-pulse"><div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-900" /></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <PageHeader title="My info" subtitle="Your own details for this society." />

      {error ? <div className="mb-4"><ErrorBanner text={error} /></div> : null}

      {!society ? (
        <Card><p className="text-sm text-zinc-500">Select a society first.</p></Card>
      ) : resident ? (
        <Card>
          <form onSubmit={save} className="grid gap-3">
            <Input required placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="zinc">Flat {resident.flat}</Badge>
              <Badge tone={resident.owner_tenant === "owner" ? "blue" : "amber"}>{resident.owner_tenant === "owner" ? "Flat owner" : "Tenant"}</Badge>
            </div>
            <p className="text-xs text-zinc-500">Flat and owner/tenant status are set by your society admin — ask them to change it.</p>
            {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}
            <Button busy={saving} busyText="Saving…" className="w-fit">Save</Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="mb-3 text-sm text-zinc-500">You&apos;re not linked to a flat here yet — set it once below.</p>
          <form onSubmit={link} className="grid gap-3 sm:grid-cols-3">
            <Input required placeholder="Flat (e.g. A-101)" value={linkForm.flat} onChange={(e) => setLinkForm({ ...linkForm, flat: e.target.value })} />
            <Input placeholder="Phone" value={linkForm.phone} onChange={(e) => setLinkForm({ ...linkForm, phone: e.target.value })} />
            <Select value={linkForm.owner_tenant} onChange={(e) => setLinkForm({ ...linkForm, owner_tenant: e.target.value as "owner" | "tenant" })}>
              <option value="tenant">Tenant</option>
              <option value="owner">Flat owner</option>
            </Select>
            <Button busy={saving} busyText="Saving…" className="sm:col-span-3 w-fit">Set my flat</Button>
          </form>
        </Card>
      )}

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back
      </Link>
    </div>
  );
}
