"use client";

import { useEffect, useState } from "react";
import { Card, Empty, PageHeader } from "@/components/ui";
import type { Society } from "@/lib/cloudflare";
import { getSelectedSociety, setSelectedSociety } from "@/lib/society";

type Counts = Record<string, { residents: number; dues: number; openComplaints: number; activeVisitors: number }>;

export default function SocietiesPage() {
  const [rows, setRows] = useState<Society[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [form, setForm] = useState({ name: "", city: "" });
  const [current, setCurrent] = useState<string | null>(() => getSelectedSociety());

  const load = () => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then(async (list: Society[]) => {
        setRows(list);
        const entries = await Promise.all(
          list.map(async (s) => {
            try {
              const r = await fetch(`/api/summary?society=${s.id}`).then((x) => x.json());
              return [s.id, r] as const;
            } catch {
              return [s.id, { residents: 0, dues: 0, openComplaints: 0, activeVisitors: 0 }] as const;
            }
          })
        );
        setCounts(Object.fromEntries(entries));
      })
      .catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/societies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const created = await res.json().catch(() => null);
    setForm({ name: "", city: "" });
    if (created?.id) {
      setSelectedSociety(created.id);
      setCurrent(created.id);
    }
    load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" and ALL its residents, bills, complaints, visitors and notices?`)) return;
    await fetch(`/api/societies?id=${id}`, { method: "DELETE" });
    if (current === id) {
      setSelectedSociety(null);
      setCurrent(null);
    }
    load();
  }

  function select(id: string) {
    setSelectedSociety(id);
    setCurrent(id);
  }

  return (
    <div>
      <PageHeader
        title="Societies"
        subtitle="Platform admin — each society is an isolated tenant with its own residents, bills, tickets, visitors and notices."
      />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Society name (e.g. Greenview Heights)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
            Add society
          </button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? (
          <Empty text="No societies yet." />
        ) : (
          rows.map((s) => {
            const c = counts[s.id];
            return (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {s.name}
                    {s.id === current ? <span className="ml-2 text-xs font-normal text-green-600">· active</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {s.city || "—"}
                    {c ? ` · ${c.residents} residents · ₹${c.dues.toLocaleString("en-IN")} dues · ${c.openComplaints} open tickets · ${c.activeVisitors} visitors` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.id !== current ? (
                    <button
                      onClick={() => select(s.id)}
                      className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Switch to
                    </button>
                  ) : null}
                  <button
                    onClick={() => remove(s.id, s.name)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    aria-label={`Delete society ${s.name}`}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
