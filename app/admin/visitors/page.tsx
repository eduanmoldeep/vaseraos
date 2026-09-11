"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import type { Visitor } from "@/lib/cloudflare";
import { getSelectedSociety } from "@/lib/society";

export default function VisitorsPage() {
  const [society, setSociety] = useState<string | null>(() => getSelectedSociety());
  const [rows, setRows] = useState<Visitor[]>([]);
  const [form, setForm] = useState({ name: "", flat: "", purpose: "Guest" });

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); return; }
    fetch(`/api/visitors?society=${id}`).then((r) => r.json()).then(setRows).catch(() => {});
  };
  useEffect(() => {
    const id = getSelectedSociety();
    if (id) {
      fetch(`/api/visitors?society=${id}`)
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
    await fetch("/api/visitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, society_id: getSelectedSociety() }) });
    setForm({ name: "", flat: "", purpose: "Guest" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/visitors", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this visitor log?")) return;
    await fetch(`/api/visitors?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Visitors" subtitle="Gate log — expected → checked in → checked out." />
        <div className="mt-4"><NeedsSociety label="visitors" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Visitors" subtitle="Gate log — expected → checked in → checked out." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <input required placeholder="Visitor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input required placeholder="Flat to visit" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">Pre-approve</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <Empty text="No visitors logged." /> : rows.map((v) => (
          <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{v.name} <span className="text-zinc-500">→ {v.flat}</span></p>
              <p className="text-xs text-zinc-500">{v.purpose}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={v.status === "checked_in" ? "green" : v.status === "checked_out" ? "zinc" : "blue"}>{v.status.replace("_", " ")}</Badge>
              <select
                value={v.status}
                onChange={(e) => setStatus(v.id, e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                aria-label={`Visitor status for ${v.name}`}
              >
                <option value="expected">expected</option>
                <option value="checked_in">checked in</option>
                <option value="checked_out">checked out</option>
              </select>
              <button
                onClick={() => remove(v.id)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                aria-label={`Delete visitor ${v.name}`}
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
