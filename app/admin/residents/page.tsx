"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Resident } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function ResidentsPage() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [rows, setRows] = useState<Resident[]>([]);
  const [form, setForm] = useState({ name: "", flat: "", phone: "" });

  const load = async (id: string | null = society) => {
    if (!id) return;
    const data = await fetch(`/api/residents?society=${id}`).then((r) => r.json()).catch(() => null);
    if (data) setRows(data);
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/residents?society=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data) setRows(data); })
        .catch(() => {});
    }
    const onSwitch = (e: Event) => { const next = (e as CustomEvent<string | null>).detail ?? null; setSociety(next); load(next); };
    window.addEventListener("vaseraos-society", onSwitch);
    return () => window.removeEventListener("vaseraos-society", onSwitch);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/residents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, society_id: getSelectedSociety() }),
    });
    setForm({ name: "", flat: "", phone: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this resident?")) return;
    await fetch(`/api/residents?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Residents" subtitle="Flats, owners, tenants & members." />
        <div className="mt-4"><NeedsSociety label="residents" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Residents" subtitle="Flats, owners, tenants & members." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Flat (e.g. A-101)" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Add resident</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No residents yet." /> : rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{r.name} <span className="text-zinc-500">· {r.flat}</span></p>
              <p className="text-xs text-zinc-500">{r.phone} · {r.members} members</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={r.owner_tenant === "owner" ? "blue" : "amber"}>{r.owner_tenant}</Badge>
              <button
                onClick={() => remove(r.id)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                aria-label={`Remove resident ${r.name}`}
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
