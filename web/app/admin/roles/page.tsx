"use client";

import { startTransition, useEffect, useState } from "react";
import { Badge, Card, Empty, ErrorBanner, ListSkeleton, PageHeader } from "@/components/ui";
import { NeedsSociety } from "@/components/NeedsSociety";
import { useSelectedSociety } from "@/lib/society";
import type { Office } from "@/lib/cloudflare";

type MemberRow = { userId: string; name: string; email: string; offices: Office[] };

const OFFICES: { value: Office; label: string; tone: "blue" | "green" | "amber" }[] = [
  { value: "president", label: "President", tone: "blue" },
  { value: "secretary", label: "Secretary", tone: "green" },
  { value: "treasurer", label: "Treasurer", tone: "amber" },
];

export default function RolesPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = (id: string | null = society) => {
    if (!id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError("");
    fetch(`/api/societies/offices?society=${id}`)
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load roles."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function toggle(userId: string, office: Office, currentOffices: Office[]) {
    const key = `${userId}:${office}`;
    setSavingKey(key);
    const next = currentOffices.includes(office) ? currentOffices.filter((o) => o !== office) : [...currentOffices, office];
    try {
      await fetch("/api/societies/offices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: society, userId, offices: next }),
      });
      setRows((prev) => prev.map((r) => (r.userId === userId ? { ...r, offices: next } : r)));
    } catch {
      setError("Couldn't update that role. Try again.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Roles" subtitle="President, secretary, treasurer — assign any combination to any member." />
        <div className="mt-4"><NeedsSociety label="roles" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="President, secretary, treasurer — assign any combination to any member. Privilege moves with the office, not the person."
      />
      {error ? <div className="mb-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}
      <div className="grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No members yet — share the society's join code first." />
        ) : (
          rows.map((m) => (
            <Card key={m.userId} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-zinc-500">{m.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {OFFICES.map((o) => {
                  const active = m.offices.includes(o.value);
                  const busy = savingKey === `${m.userId}:${o.value}`;
                  return (
                    <button
                      key={o.value}
                      disabled={busy}
                      onClick={() => toggle(m.userId, o.value, m.offices)}
                      className="disabled:opacity-50"
                      aria-pressed={active}
                    >
                      <Badge tone={active ? o.tone : "zinc"}>{o.label}</Badge>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
