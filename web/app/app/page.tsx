"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Empty, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { ShareJoinCode } from "@/components/ShareJoinCode";
import type { AuthUser } from "@/lib/cloudflare";
import { setSelectedSociety } from "@/lib/society";

type Membership = { societyId: string; name: string; status: string; offices: string[]; join_code: string | null };
type Summary = { residents: number; dues: number; openComplaints: number; activeVisitors: number };
type Notice = { id: string; title: string; body: string };
type Visitor = { id: string; name: string; flat: string; purpose: string; status: string };
type SosAlert = { id: string; flat: string; status: "open" | "acknowledged" | "resolved"; raised_by_user_id: string };

export default function ResidentApp() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [error, setError] = useState("");
  const [myFlat, setMyFlat] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [myOpenComplaints, setMyOpenComplaints] = useState<number | null>(null);
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);
  const [visitorForm, setVisitorForm] = useState({ name: "", purpose: "Guest" });
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [sosFlat, setSosFlat] = useState("");
  const [sosAlert, setSosAlert] = useState<SosAlert | null>(null);
  const [raisingSos, setRaisingSos] = useState(false);
  const [confirmingSos, setConfirmingSos] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user ?? null;
        setViewer(u);
        if (!u) { router.replace("/"); return; }
        if (u.admin) { router.replace("/admin"); return; }
        fetch("/api/me/memberships")
          .then((r) => r.json())
          .then((rows: Membership[]) => {
            if (rows.some((m) => m.offices.length > 0)) { router.replace("/admin"); return; }
            const residentRows = rows.filter((m) => m.status === "approved");
            if (residentRows.length === 0) { router.replace("/"); return; }
            setMemberships(residentRows);
            setActiveId(residentRows[0].societyId);
            setSelectedSociety(residentRows[0].societyId);
          })
          .catch(() => setError("Couldn't load your societies."));
      })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const loadSociety = (id: string) => {
    fetch(`/api/summary?society=${id}`).then((r) => r.json()).then(setSummary).catch(() => {});
    fetch(`/api/notices?society=${id}`).then((r) => r.json()).then(setNotices).catch(() => {});
    fetch(`/api/visitors?society=${id}`).then((r) => r.json()).then(setVisitors).catch(() => {});
    fetch(`/api/me/flat?society=${id}`)
      .then((r) => r.json())
      .then((d) => { setMyFlat(d?.flat ?? null); setIsOwner(d?.owner_tenant === "owner"); })
      .catch(() => {});
    fetch(`/api/complaints?society=${id}&mine=1`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { status: string }[]) => setMyOpenComplaints(rows.filter((c) => c.status !== "resolved").length))
      .catch(() => {});
    fetch(`/api/ledger?society=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLedgerBalance(d?.balance ?? null))
      .catch(() => {});
    fetch(`/api/sos?society=${id}`)
      .then((r) => r.json())
      .then((rows: SosAlert[]) => setSosAlert(rows.find((s) => s.raised_by_user_id === viewer?.id) ?? null))
      .catch(() => {});
  };
  useEffect(() => {
    if (activeId) loadSociety(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !sosAlert || sosAlert.status === "resolved") return;
    const id = setInterval(() => {
      fetch(`/api/sos?society=${activeId}`)
        .then((r) => r.json())
        .then((rows: SosAlert[]) => setSosAlert(rows.find((s) => s.id === sosAlert.id) ?? null))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [activeId, sosAlert]);

  function requestSos(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    const flat = myFlat ?? sosFlat;
    if (!flat) return;
    setConfirmingSos(true);
  }

  async function confirmSos() {
    const flat = myFlat ?? sosFlat;
    if (!activeId || !flat) return;
    setRaisingSos(true);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: activeId, flat }),
      });
      const data = await res.json();
      setSosAlert(data);
      setConfirmingSos(false);
    } finally {
      setRaisingSos(false);
    }
  }

  async function preApproveVisitor(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !myFlat) return;
    setSavingVisitor(true);
    try {
      await fetch("/api/visitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...visitorForm, flat: myFlat, society_id: activeId }),
      });
      setVisitorForm({ name: "", purpose: "Guest" });
      loadSociety(activeId);
    } finally {
      setSavingVisitor(false);
    }
  }

  if (!checked || !viewer || memberships.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Card className="animate-pulse">
          <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        </Card>
      </div>
    );
  }

  const active = memberships.find((m) => m.societyId === activeId);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">My society</p>
          {memberships.length > 1 ? (
            <Select
              value={activeId ?? ""}
              onChange={(e) => { setActiveId(e.target.value); setSelectedSociety(e.target.value); }}
              className="mt-1 w-auto text-lg font-semibold"
            >
              {memberships.map((m) => (
                <option key={m.societyId} value={m.societyId}>{m.name}</option>
              ))}
            </Select>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{active?.name}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {active?.join_code ? <ShareJoinCode societyName={active.name} joinCode={active.join_code} /> : null}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorBanner text={error} /></div> : null}

      <Card className={sosAlert && sosAlert.status !== "resolved" ? "mb-6 border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" : "mb-6"}>
        {sosAlert && sosAlert.status !== "resolved" ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-rose-700 dark:text-rose-300">
                {sosAlert.status === "acknowledged" ? "Guard is on the way" : "SOS sent — waiting for guard"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Flat {sosAlert.flat}</p>
            </div>
            <Badge tone={sosAlert.status === "acknowledged" ? "green" : "amber"}>{sosAlert.status}</Badge>
          </div>
        ) : (
          <form onSubmit={requestSos} className="flex flex-wrap items-center gap-3">
            {!myFlat ? (
              <Input required placeholder="Your flat" value={sosFlat} onChange={(e) => setSosFlat(e.target.value)} className="max-w-[10rem]" />
            ) : null}
            <Button variant="danger" busy={raisingSos} busyText="Raising SOS…">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
              </svg>
              Raise SOS
            </Button>
            <p className="text-sm text-zinc-500">
              {myFlat ? `Alerts the guard and office-holders for flat ${myFlat} immediately.` : "Alerts the society's guard and office-holders immediately."}
            </p>
          </form>
        )}
      </Card>

      <div className={`grid gap-4 sm:grid-cols-2 ${isOwner ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <Link href="/dues">
          <Card className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dues</p>
            <p className="mt-1 text-xl font-semibold">{summary ? `₹${summary.dues.toLocaleString("en-IN")}` : "—"}</p>
          </Card>
        </Link>
        <Link href="/complaints">
          <Card className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">My open complaints</p>
            <p className="mt-1 text-xl font-semibold">{myOpenComplaints ?? "—"}</p>
          </Card>
        </Link>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active visitors</p>
          <p className="mt-1 text-xl font-semibold">{summary?.activeVisitors ?? "—"}</p>
        </Card>
        {isOwner ? (
          <Link href="/ledger">
            <Card className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Society balance</p>
              <p className="mt-1 text-xl font-semibold">{ledgerBalance !== null ? `₹${ledgerBalance.toLocaleString("en-IN")}` : "—"}</p>
            </Card>
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <PageHeader title="Notices" />
        <div className="grid gap-3">
          {notices.length === 0 ? <Empty text="No notices yet." /> : notices.map((n) => (
            <Card key={n.id}>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="mt-1 text-sm text-zinc-500">{n.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <PageHeader title="Complaints" />
          <Card>
            {myFlat ? (
              <p className="text-sm text-zinc-500">
                Raising for flat <span className="font-medium text-zinc-700 dark:text-zinc-300">{myFlat}</span>. Raise a ticket and track
                its status on your own complaints page.
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Your account isn&apos;t linked to a flat yet — ask your society admin to add you as a resident using this account&apos;s email.
              </p>
            )}
            <Link href="/complaints" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              View my complaints →
            </Link>
          </Card>
        </div>

        <div>
          <PageHeader title="Visitors" />
          <Card>
            {myFlat ? (
              <form onSubmit={preApproveVisitor} className="grid gap-2">
                <p className="text-xs text-zinc-500">Visiting flat <span className="font-medium text-zinc-700 dark:text-zinc-300">{myFlat}</span></p>
                <Input required placeholder="Visitor name" value={visitorForm.name} onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })} />
                <Select value={visitorForm.purpose} onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}>
                  <option value="Guest">Guest</option>
                  <option value="Delivery">Delivery</option>
                  <option value="HouseHelp">HouseHelp</option>
                  <option value="Home Service">Home Service</option>
                </Select>
                <Button busy={savingVisitor} busyText="Adding…">Pre-approve visitor</Button>
              </form>
            ) : (
              <p className="text-sm text-zinc-500">
                Your account isn&apos;t linked to a flat yet — ask your society admin, or set it yourself under My info.
              </p>
            )}
          </Card>
          <div className="mt-3 grid gap-2">
            {visitors.length === 0 ? <p className="text-sm text-zinc-500">No visitors logged.</p> : visitors.map((v) => (
              <Card key={v.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{v.name} <span className="text-zinc-500">→ {v.flat}</span></p>
                  <p className="text-xs text-zinc-500">{v.purpose}</p>
                </div>
                <Badge tone={v.status === "checked_in" ? "green" : v.status === "checked_out" ? "zinc" : "blue"}>{v.status.replace("_", " ")}</Badge>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {confirmingSos ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Confirm SOS</p>
            <p className="mt-2 text-xl font-semibold">Raise the alarm?</p>
            <p className="mt-1 text-sm text-zinc-500">
              This immediately alerts the guard and office-holders for flat <span className="font-medium text-zinc-700 dark:text-zinc-300">{myFlat ?? sosFlat}</span>.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmingSos(false)} disabled={raisingSos}>Cancel</Button>
              <Button variant="danger" busy={raisingSos} busyText="Raising…" onClick={confirmSos}>Yes, raise SOS</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
