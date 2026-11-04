"use client";

import { startTransition, useEffect, useState } from "react";
import { NeedsSociety } from "@/components/NeedsSociety";
import { Card, Empty, ErrorBanner, ListSkeleton, PageHeader, ToggleChip } from "@/components/ui";
import type { Office } from "@/lib/cloudflare";
import { useSelectedSociety } from "@/lib/society";

type MemberRow = { userId: string; name: string; email: string; offices: Office[] };

const OFFICES: { value: Office; label: string; can: string }[] = [
  { value: "president", label: "President", can: "Posts notices, plus everything below." },
  { value: "secretary", label: "Secretary", can: "Runs residents, complaints, visitors, guards and accounts." },
  { value: "treasurer", label: "Treasurer", can: "Sets the maintenance amount and UPI, adds bills, plus everything a secretary can." },
];

export default function RolesPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    fetch(`/api/societies/offices?society=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError("Couldn't load committee roles."));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function toggle(m: MemberRow, office: Office) {
    const key = `${m.userId}:${office}`;
    const removing = m.offices.includes(office);
    if (removing && !confirm(`Remove ${m.name} as ${office}?`)) return;
    setSavingKey(key);
    const next = removing ? m.offices.filter((o) => o !== office) : [...m.offices, office];
    try {
      const res = await fetch("/api/societies/offices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: society, userId: m.userId, offices: next }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => (prev ?? []).map((r) => (r.userId === m.userId ? { ...r, offices: next } : r)));
    } catch {
      setError("Couldn't update that role. Please try again.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!society) {
    return (
      <div>
        <PageHeader title="Committee roles" />
        <NeedsSociety label="committee roles" />
      </div>
    );
  }

  const committee = (rows ?? []).filter((m) => m.offices.length > 0);
  const others = (rows ?? []).filter((m) => m.offices.length === 0);

  return (
    <div>
      <PageHeader title="Committee roles" subtitle="Tap a role to give it to someone, tap again to take it away. Anyone can hold more than one." />

      <Card className="mb-6">
        <dl className="grid gap-3 sm:grid-cols-3">
          {OFFICES.map((o) => (
            <div key={o.value}>
              <dt className="text-base font-semibold">{o.label}</dt>
              <dd className="text-base text-zinc-600 dark:text-zinc-400">{o.can}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {error ? <div className="mb-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Empty text="No members have signed up yet." hint="Share your society's invite code first — roles can only go to people with an account." />
      ) : (
        <div className="grid gap-3">
          {[...committee, ...others].map((m) => (
            <Card key={m.userId}>
              <p className="text-lg font-semibold">{m.name}</p>
              <p className="text-base text-zinc-600 dark:text-zinc-400">{m.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {OFFICES.map((o) => (
                  <ToggleChip
                    key={o.value}
                    on={m.offices.includes(o.value)}
                    busy={savingKey === `${m.userId}:${o.value}`}
                    onClick={() => toggle(m, o.value)}
                    label={`${m.offices.includes(o.value) ? "Remove" : "Make"} ${m.name} ${o.label}`}
                  >
                    {o.label}
                  </ToggleChip>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
