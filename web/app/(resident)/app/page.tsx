"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { AddPanel } from "@/components/AddPanel";
import { Icon, type IconName } from "@/components/icons";
import { useResident } from "@/components/ResidentShell";
import { Badge, Button, Card, ChoiceGroup, ErrorBanner, Field, Input, LinkButton, SuccessBanner } from "@/components/ui";
import type { Bill, Notice, Visitor } from "@/lib/cloudflare";
import { formatPeriod, inr, statusOf, VISITOR_PURPOSES, VISITOR_STATUS } from "@/lib/labels";

type SosAlert = { id: string; flat: string; status: "open" | "acknowledged" | "resolved"; raised_by_user_id: string };
type Purpose = (typeof VISITOR_PURPOSES)[number]["value"];

/**
 * Resident home: the emergency button first, then one card per everyday job —
 * each card states where things stand in a sentence and offers one next step.
 */
export default function ResidentHome() {
  const { viewer, society, flat, isOwner } = useResident();
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [openComplaints, setOpenComplaints] = useState<number | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [sosAlert, setSosAlert] = useState<SosAlert | null>(null);

  const load = (id: string) => {
    fetch(`/api/bills?society=${id}&mine=1`).then((r) => (r.ok ? r.json() : [])).then(setBills).catch(() => setBills([]));
    fetch(`/api/complaints?society=${id}&mine=1`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { status: string }[]) => setOpenComplaints(rows.filter((c) => c.status !== "resolved").length))
      .catch(() => {});
    fetch(`/api/visitors?society=${id}`).then((r) => (r.ok ? r.json() : [])).then(setVisitors).catch(() => {});
    fetch(`/api/notices?society=${id}`).then((r) => (r.ok ? r.json() : [])).then(setNotices).catch(() => setNotices([]));
    fetch(`/api/sos?society=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: SosAlert[]) => setSosAlert(rows.find((s) => s.raised_by_user_id === viewer.id) ?? null))
      .catch(() => {});
  };

  useEffect(() => {
    if (society) startTransition(() => load(society));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  useEffect(() => {
    if (!society || !isOwner) return;
    fetch(`/api/ledger?society=${society}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBalance(d?.balance ?? null))
      .catch(() => {});
  }, [society, isOwner]);

  const firstName = viewer.name.split(" ")[0];
  const myVisitors = flat ? visitors.filter((v) => v.flat === flat && v.status !== "checked_out") : [];

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-bold tracking-tight">Hello, {firstName}</h1>

      <SosPanel society={society} flat={flat} alert={sosAlert} onChange={setSosAlert} />

      <DuesCard bills={bills} />

      <HomeCard icon="wrench" title="Problems & repairs">
        <p className="text-lg">
          {openComplaints === null
            ? " "
            : openComplaints === 0
              ? "You have no open complaints."
              : `You have ${openComplaints} complaint${openComplaints === 1 ? "" : "s"} being looked at.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/complaints" icon="plus">Report a problem</LinkButton>
          {openComplaints ? <LinkButton href="/complaints" variant="secondary">See my complaints</LinkButton> : null}
        </div>
      </HomeCard>

      <VisitorsCard society={society} flat={flat} visitors={myVisitors} onAdded={() => society && load(society)} />

      <HomeCard icon="megaphone" title="Latest notices">
        {notices === null ? (
          <p className="text-lg">&nbsp;</p>
        ) : notices.length === 0 ? (
          <p className="text-lg text-zinc-600 dark:text-zinc-400">No notices from the committee yet.</p>
        ) : (
          <ul className="grid gap-3">
            {notices.slice(0, 2).map((n) => (
              <li key={n.id}>
                <Link href={`/notices#n_${n.id}`} className="block rounded-xl bg-zinc-50 p-4 transition hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                  <p className="text-lg font-semibold">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-base text-zinc-700 dark:text-zinc-300">{n.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {notices && notices.length > 0 ? (
          <LinkButton href="/notices" variant="secondary" className="mt-4">
            See all notices ({notices.length})
          </LinkButton>
        ) : null}
      </HomeCard>

      {isOwner ? (
        <HomeCard icon="book" title="Society accounts">
          <p className="text-base text-zinc-700 dark:text-zinc-300">Money in the society account now</p>
          <p className="text-3xl font-bold tracking-tight">{balance === null ? "…" : inr(balance)}</p>
          <LinkButton href="/ledger" variant="secondary" className="mt-4">
            See income &amp; spending
          </LinkButton>
        </HomeCard>
      ) : null}
    </div>
  );
}

function HomeCard({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2.5 text-xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

function DuesCard({ bills }: { bills: Bill[] | null }) {
  const unpaid = (bills ?? []).filter((b) => b.status === "pending" || b.status === "overdue");
  const checking = (bills ?? []).filter((b) => b.status === "pending_verification");
  const total = unpaid.reduce((a, b) => a + b.amount, 0);
  const overdue = unpaid.some((b) => b.status === "overdue");
  const oldest = [...unpaid].sort((a, b) => a.month.localeCompare(b.month))[0];

  return (
    <HomeCard icon="wallet" title="Maintenance dues">
      {bills === null ? (
        <div className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : total > 0 ? (
        <>
          <p className={`text-3xl font-bold tracking-tight ${overdue ? "text-red-700 dark:text-red-400" : ""}`}>{inr(total)} to pay</p>
          <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">
            {unpaid.length === 1 ? `For ${formatPeriod(unpaid[0].month)}` : `${unpaid.length} bills, from ${formatPeriod(oldest.month)}`}
            {overdue ? " — overdue" : ""}
          </p>
          <LinkButton href="/dues" variant="accent" size="lg" icon="wallet" className="mt-4 w-full sm:w-auto">
            Pay now
          </LinkButton>
        </>
      ) : (
        <p className="flex items-center gap-2 text-lg font-semibold text-green-800 dark:text-green-300">
          <Icon name="check" className="h-6 w-6" /> All paid up. Thank you!
        </p>
      )}
      {checking.length > 0 ? (
        <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300">
          {checking.length === 1 ? "1 payment is" : `${checking.length} payments are`} being checked by the treasurer.
        </p>
      ) : null}
    </HomeCard>
  );
}

function SosPanel({
  society,
  flat,
  alert,
  onChange,
}: {
  society: string | null;
  flat: string | null | undefined;
  alert: SosAlert | null;
  onChange: (a: SosAlert | null) => void;
}) {
  const [typedFlat, setTypedFlat] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [raising, setRaising] = useState(false);
  const [error, setError] = useState("");
  const targetFlat = flat ?? typedFlat.trim();

  // While an alert is live, keep checking whether the guard has responded.
  useEffect(() => {
    if (!society || !alert || alert.status === "resolved") return;
    const id = setInterval(() => {
      fetch(`/api/sos?society=${society}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: SosAlert[]) => onChange(rows.find((s) => s.id === alert.id) ?? null))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [society, alert, onChange]);

  async function raise() {
    if (!society || !targetFlat) return;
    setRaising(true);
    setError("");
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: society, flat: targetFlat }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't send the alert.");
      onChange(data);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? `${e.message} Please call the guard directly.` : "Couldn't send the alert. Please call the guard directly.");
      setConfirming(false);
    } finally {
      setRaising(false);
    }
  }

  if (alert && alert.status !== "resolved") {
    const coming = alert.status === "acknowledged";
    return (
      <div role="status" aria-live="assertive" className={`rounded-2xl border-2 p-5 ${coming ? "border-green-600 bg-green-50 dark:bg-green-950/40" : "border-red-600 bg-red-50 dark:bg-red-950/40"}`}>
        <p className={`text-sm font-bold uppercase tracking-wide ${coming ? "text-green-800 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>Emergency alert sent</p>
        <p className="mt-1 text-2xl font-bold">{coming ? "A guard is on the way" : "Alerting the guard now…"}</p>
        <p className="mt-2 text-lg">Flat {alert.flat}</p>
        <ol className="mt-4 grid gap-2 text-base">
          <li className="flex items-center gap-2"><Icon name="check" className="h-5 w-5 text-green-700" /> Alert sent to guard and committee</li>
          <li className="flex items-center gap-2">
            {coming ? <Icon name="check" className="h-5 w-5 text-green-700" /> : <span className="ml-1 h-3 w-3 animate-pulse rounded-full bg-red-600" />}
            {coming ? "Guard has seen it and is coming" : "Waiting for the guard to respond"}
          </li>
        </ol>
        <p className="mt-4 text-base text-zinc-700 dark:text-zinc-300">Pressed by mistake? Tell the guard when they arrive — they or a committee member will switch it off.</p>
      </div>
    );
  }

  return (
    <div>
      {error ? <div className="mb-3"><ErrorBanner text={error} /></div> : null}
      {flat === null ? (
        <Field label="Your flat number" hint="Needed so the guard knows where to come." className="mb-3">
          <Input value={typedFlat} onChange={(e) => setTypedFlat(e.target.value)} placeholder="e.g. A-101" />
        </Field>
      ) : null}
      <button
        type="button"
        disabled={!society || !targetFlat}
        onClick={() => setConfirming(true)}
        className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-red-600 px-5 py-4 text-left text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Icon name="alert" className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-2xl font-bold leading-tight">Emergency SOS</span>
          <span className="block text-base text-red-50">Press if you need urgent help — alerts the guard</span>
        </span>
      </button>

      {confirming ? (
        <div role="alertdialog" aria-modal="true" aria-labelledby="sos-confirm-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <p className="text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-400">Emergency SOS</p>
            <p id="sos-confirm-title" className="mt-2 text-2xl font-bold">Call for help now?</p>
            <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">
              The guard and committee will be alerted to come to flat <span className="font-bold">{targetFlat}</span>.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={raise}
                disabled={raising}
                autoFocus
                className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-xl font-bold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {raising ? "Sending alert…" : "Yes, send alert"}
              </button>
              <Button variant="secondary" size="lg" onClick={() => setConfirming(false)} disabled={raising}>
                No, go back
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VisitorsCard({
  society,
  flat,
  visitors,
  onAdded,
}: {
  society: string | null;
  flat: string | null | undefined;
  visitors: Visitor[];
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("Guest");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    if (!society || !flat) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, purpose, flat, society_id: society }),
      });
      if (!res.ok) throw new Error();
      setDone(`The gate has been told that ${name} is coming.`);
      setName("");
      setPurpose("Guest");
      close();
      onAdded();
    } catch {
      setError("Couldn't save the visitor. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HomeCard icon="door" title="Visitors">
      {done ? <div className="mb-3"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}
      {flat === null ? (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          Set your flat number first in{" "}
          <Link href="/me" className="font-semibold text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
            Account
          </Link>{" "}
          to tell the gate about visitors.
        </p>
      ) : (
        <>
          {visitors.length === 0 ? (
            <p className="mb-4 text-lg text-zinc-700 dark:text-zinc-300">Expecting someone? Let the gate know so they are let in.</p>
          ) : (
            <ul className="mb-4 grid gap-2">
              {visitors.map((v) => {
                const s = statusOf(VISITOR_STATUS, v.status);
                return (
                  <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <span>
                      <span className="block text-lg font-semibold">{v.name}</span>
                      <span className="block text-base text-zinc-600 dark:text-zinc-400">{VISITOR_PURPOSES.find((p) => p.value === v.purpose)?.label ?? v.purpose}</span>
                    </span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
          <AddPanel label="Add a visitor" title="Who is coming?" variant="primary">
            {(close) => (
              <form onSubmit={(e) => add(e, close)} className="grid gap-4">
                <Field label="Visitor's name">
                  <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunil" autoFocus />
                </Field>
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1.5 text-base font-medium">Reason for visit</legend>
                  <ChoiceGroup name="purpose" options={VISITOR_PURPOSES} value={purpose} onChange={setPurpose} />
                </fieldset>
                {error ? <ErrorBanner text={error} /> : null}
                <Button size="lg" busy={saving} busyText="Saving…" icon="check">
                  Tell the gate
                </Button>
              </form>
            )}
          </AddPanel>
        </>
      )}
    </HomeCard>
  );
}
