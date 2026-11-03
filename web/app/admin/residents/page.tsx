"use client";

import { startTransition, useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { NeedsSociety } from "@/components/NeedsSociety";
import {
  Badge,
  Button,
  Card,
  ChoiceGroup,
  Empty,
  ErrorBanner,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
  PhoneLink,
  SuccessBanner,
  ToggleChip,
} from "@/components/ui";
import type { Office, Resident } from "@/lib/cloudflare";
import { useSelectedSociety } from "@/lib/society";

const OFFICES: { value: Office; label: string }[] = [
  { value: "president", label: "President" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
];
const OWNER_TENANT = [
  { value: "owner", label: "Owner" },
  { value: "tenant", label: "Tenant" },
] as const;

export default function ResidentsPage() {
  const society = useSelectedSociety();
  const [rows, setRows] = useState<Resident[] | null>(null);
  const [offices, setOffices] = useState<Record<string, Office[]>>({});
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = (id: string | null = society) => {
    if (!id) return;
    setError("");
    Promise.all([
      fetch(`/api/residents?society=${id}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/societies/offices?society=${id}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([residentRows, officeRows]: [Resident[], { userId: string; offices: Office[] }[]]) => {
        setRows(residentRows ?? []);
        setOffices(Object.fromEntries((officeRows ?? []).map((o) => [o.userId, o.offices])));
      })
      .catch(() => setError("Couldn't load residents."));
  };
  useEffect(() => {
    startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  if (!society) {
    return (
      <div>
        <PageHeader title="Residents" />
        <NeedsSociety label="residents" />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = (rows ?? [])
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.flat.toLowerCase().includes(q) || r.phone.includes(q))
    .sort((a, b) => a.flat.localeCompare(b.flat, undefined, { numeric: true }));

  return (
    <div>
      <PageHeader title="Residents" subtitle={rows ? `${rows.length} resident${rows.length === 1 ? "" : "s"} — flats, owners and tenants.` : "Flats, owners and tenants."} />

      <AddResident society={society} onAdded={(name) => { setDone(`${name} has been added.`); load(); }} />

      {done ? <div className="mt-4"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      {error ? <div className="mt-4"><ErrorBanner text={error} onRetry={() => load()} /></div> : null}

      {rows && rows.length > 4 ? (
        <Field label="Search" className="mt-6">
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, flat or phone" />
        </Field>
      ) : null}

      <div className="mt-4 grid gap-3">
        {rows === null ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <Empty text={q ? "No one matches that search." : "No residents yet."} hint={q ? undefined : "Add residents above, or share your society's invite code."} />
        ) : (
          shown.map((r) => (
            <ResidentRow
              key={r.id}
              resident={r}
              offices={r.user_id ? offices[r.user_id] ?? [] : []}
              open={editing === r.id}
              onToggle={() => setEditing(editing === r.id ? null : r.id)}
              society={society}
              onChanged={(patch) => setRows((prev) => (prev ?? []).map((row) => (row.id === r.id ? { ...row, ...patch } : row)))}
              onOfficesChanged={(next) => r.user_id && setOffices((prev) => ({ ...prev, [r.user_id!]: next }))}
              onRemoved={() => { setEditing(null); setDone(`${r.name} has been removed.`); load(); }}
              onError={setError}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ResidentRow({
  resident: r,
  offices,
  open,
  onToggle,
  society,
  onChanged,
  onOfficesChanged,
  onRemoved,
  onError,
}: {
  resident: Resident;
  offices: Office[];
  open: boolean;
  onToggle: () => void;
  society: string;
  onChanged: (patch: Partial<Resident>) => void;
  onOfficesChanged: (next: Office[]) => void;
  onRemoved: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function setOwnerTenant(next: "owner" | "tenant") {
    if (next === r.owner_tenant) return;
    setBusy("owner");
    try {
      const res = await fetch("/api/residents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, owner_tenant: next }),
      });
      if (!res.ok) throw new Error();
      onChanged({ owner_tenant: next });
    } catch {
      onError("Couldn't change owner/tenant. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleOffice(office: Office) {
    if (!r.user_id) return;
    const next = offices.includes(office) ? offices.filter((o) => o !== office) : [...offices, office];
    setBusy(office);
    try {
      const res = await fetch("/api/societies/offices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: society, userId: r.user_id, offices: next }),
      });
      if (!res.ok) throw new Error();
      onOfficesChanged(next);
    } catch {
      onError("Couldn't update that role. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${r.name} (flat ${r.flat}) from the residents list?`)) return;
    setBusy("remove");
    try {
      await fetch(`/api/residents?id=${r.id}`, { method: "DELETE" });
      onRemoved();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card tone={open ? "indigo" : "default"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">
            {r.name} <span className="font-normal text-zinc-600 dark:text-zinc-400">· Flat {r.flat}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
            <PhoneLink phone={r.phone} />
            {r.email ? <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">{r.email}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={r.owner_tenant === "owner" ? "blue" : "amber"}>{r.owner_tenant === "owner" ? "Owner" : "Tenant"}</Badge>
            {offices.map((o) => (
              <Badge key={o} tone="green">{OFFICES.find((x) => x.value === o)?.label}</Badge>
            ))}
            {!r.user_id ? <Badge tone="zinc">Not signed up yet</Badge> : null}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onToggle} aria-expanded={open} className="shrink-0">
          {open ? "Done" : "Edit"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <fieldset disabled={busy === "owner"}>
            <legend className="mb-2 text-base font-medium">Owner or tenant?</legend>
            <ChoiceGroup name={`ot_${r.id}`} options={OWNER_TENANT} value={r.owner_tenant} onChange={setOwnerTenant} />
          </fieldset>
          <div>
            <p className="mb-2 text-base font-medium">Committee role</p>
            {r.user_id ? (
              <div className="flex flex-wrap gap-2">
                {OFFICES.map((o) => (
                  <ToggleChip key={o.value} on={offices.includes(o.value)} busy={busy === o.value} onClick={() => toggleOffice(o.value)} label={`${offices.includes(o.value) ? "Remove" : "Make"} ${r.name} ${o.label}`}>
                    {o.label}
                  </ToggleChip>
                ))}
              </div>
            ) : (
              <p className="text-base text-zinc-600 dark:text-zinc-400">They can be given a committee role after they sign up with {r.email ? r.email : "an email you add for them"}.</p>
            )}
          </div>
          <div>
            <Button variant="danger" icon="x" busy={busy === "remove"} busyText="Removing…" onClick={remove}>
              Remove this resident
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function AddResident({ society, onAdded }: { society: string; onAdded: (name: string) => void }) {
  const empty = { name: "", email: "", flat: "", phone: "", owner_tenant: "owner" as "owner" | "tenant" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/residents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add the resident.");
      const name = form.name;
      setForm(empty);
      close();
      onAdded(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the resident.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddPanel label="Add a resident">
      {(close) => (
        <form onSubmit={(e) => add(e, close)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Flat number" hint="For example A-101">
            <Input required value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} />
          </Field>
          <Field label="Phone number">
            <Input required type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email" optional hint="If they sign up with this email, their account links to this flat automatically.">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-base font-medium">Owner or tenant?</legend>
            <ChoiceGroup name="new_owner_tenant" options={OWNER_TENANT} value={form.owner_tenant} onChange={(v) => setForm({ ...form, owner_tenant: v })} />
          </fieldset>
          {error ? <div className="sm:col-span-2"><ErrorBanner text={error} /></div> : null}
          <Button icon="check" busy={saving} busyText="Adding…" className="sm:col-span-2 sm:w-fit">
            Add resident
          </Button>
        </form>
      )}
    </AddPanel>
  );
}
