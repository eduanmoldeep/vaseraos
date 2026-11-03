"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { PushToggle } from "@/components/PushToggle";
import { useResident } from "@/components/ResidentShell";
import { ShareJoinCode } from "@/components/ShareJoinCode";
import { TextSizeControl } from "@/components/TextSizeControl";
import { Badge, Button, Card, ChoiceGroup, ErrorBanner, Field, Input, PageHeader, SuccessBanner } from "@/components/ui";
import type { Resident } from "@/lib/cloudflare";

const OWNER_TENANT = [
  { value: "owner", label: "I own the flat" },
  { value: "tenant", label: "I rent the flat" },
] as const;

/** Everything about "me" in one place: details, text size, alerts, invite, help, log out. */
export default function AccountPage() {
  const { viewer, society, societyName, joinCode, refreshFlat } = useResident();
  const [resident, setResident] = useState<Resident | null | undefined>(undefined); // undefined = loading
  const [linkForm, setLinkForm] = useState({ flat: "", phone: "", owner_tenant: "owner" as "owner" | "tenant" });
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!society) return;
    startTransition(() => {
      fetch(`/api/me/resident?society=${society}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Resident | null) => {
          setResident(d);
          if (d) setEditForm({ name: d.name, phone: d.phone });
        })
        .catch(() => setResident(null));
    });
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
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save your flat.");
      setResident(data);
      setEditForm({ name: data.name, phone: data.phone });
      setSuccess("Your flat has been saved.");
      refreshFlat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your flat. Please try again.");
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
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save your details.");
      setResident(data);
      setSuccess("Your details have been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="My account" />

      <Card className="flex items-center gap-4">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-white dark:bg-zinc-200 dark:text-zinc-900">
          {viewer.name ? viewer.name[0].toUpperCase() : "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{viewer.name}</p>
          <p className="truncate text-base text-zinc-600 dark:text-zinc-400">{viewer.email}</p>
        </div>
      </Card>

      {success ? <SuccessBanner text={success} onClose={() => setSuccess("")} /> : null}
      {error ? <ErrorBanner text={error} /> : null}

      <Card>
        <h2 className="mb-4 text-xl font-semibold">My details{societyName ? ` in ${societyName}` : ""}</h2>
        {resident === undefined ? (
          <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        ) : resident ? (
          <form onSubmit={save} className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="zinc">Flat {resident.flat}</Badge>
              <Badge tone={resident.owner_tenant === "owner" ? "blue" : "amber"}>{resident.owner_tenant === "owner" ? "Owner" : "Tenant"}</Badge>
            </div>
            <Field label="Your name">
              <Input required autoComplete="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Phone number" hint="So the committee or guard can reach you.">
              <Input type="tel" autoComplete="tel" inputMode="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </Field>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">To change your flat or owner/tenant status, ask your society committee.</p>
            <Button busy={saving} busyText="Saving…" icon="check" className="w-full sm:w-fit">
              Save my details
            </Button>
          </form>
        ) : (
          <form onSubmit={link} className="grid gap-4">
            <p className="text-lg text-zinc-700 dark:text-zinc-300">Tell us which flat is yours. You only need to do this once.</p>
            <Field label="Flat number" hint="For example A-101">
              <Input required value={linkForm.flat} onChange={(e) => setLinkForm({ ...linkForm, flat: e.target.value })} />
            </Field>
            <Field label="Phone number" optional>
              <Input type="tel" autoComplete="tel" inputMode="tel" value={linkForm.phone} onChange={(e) => setLinkForm({ ...linkForm, phone: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-base font-medium">Do you own or rent this flat?</legend>
              <ChoiceGroup name="owner_tenant" options={OWNER_TENANT} value={linkForm.owner_tenant} onChange={(v) => setLinkForm({ ...linkForm, owner_tenant: v })} />
            </fieldset>
            <Button busy={saving} busyText="Saving…" icon="check" className="w-full sm:w-fit">
              Save my flat
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-xl font-semibold">Text size</h2>
        <p className="mb-4 text-base text-zinc-600 dark:text-zinc-400">Make everything in the app bigger and easier to read.</p>
        <TextSizeControl />
      </Card>

      <Card>
        <h2 className="mb-3 text-xl font-semibold">Alerts</h2>
        <PushToggle />
      </Card>

      {joinCode ? (
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Invite your family or neighbours</h2>
          <p className="mb-4 text-base text-zinc-600 dark:text-zinc-400">
            They sign up and enter the invite code <span className="font-mono text-lg font-bold text-zinc-950 dark:text-white">{joinCode}</span>
          </p>
          <ShareJoinCode societyName={societyName} joinCode={joinCode} />
        </Card>
      ) : null}

      <Card padding="sm">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <MenuLink href="/help" icon="help" title="Get help" subtitle="Something not working? Ask the VaseraOS team." />
          <MenuLink href="/feedback" icon="lightbulb" title="Suggest an improvement" subtitle="Tell us what would make the app better." />
        </ul>
      </Card>

      <Button variant="secondary" size="lg" icon="logout" busy={loggingOut} busyText="Logging out…" onClick={logout} className="w-full">
        Log out
      </Button>
    </div>
  );
}

function MenuLink({ href, icon, title, subtitle }: { href: string; icon: IconName; title: string; subtitle: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-900">
        <Icon name={icon} className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
        <span className="flex-1">
          <span className="block text-lg font-semibold">{title}</span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</span>
        </span>
        <Icon name="chevronRight" className="h-5 w-5 text-zinc-500" />
      </Link>
    </li>
  );
}
