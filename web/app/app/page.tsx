"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Empty, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import type { AuthUser } from "@/lib/cloudflare";

type Membership = { societyId: string; name: string; status: string; offices: string[] };
type Summary = { residents: number; dues: number; openComplaints: number; activeVisitors: number };
type Notice = { id: string; title: string; body: string };
type Complaint = { id: string; flat: string; title: string; category: string; status: string };
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
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [error, setError] = useState("");
  const [complaintForm, setComplaintForm] = useState({ flat: "", title: "", category: "general" });
  const [visitorForm, setVisitorForm] = useState({ name: "", flat: "", purpose: "Guest" });
  const [savingComplaint, setSavingComplaint] = useState(false);
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [sosFlat, setSosFlat] = useState("");
  const [sosAlert, setSosAlert] = useState<SosAlert | null>(null);
  const [raisingSos, setRaisingSos] = useState(false);

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
          })
          .catch(() => setError("Couldn't load your societies."));
      })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const loadSociety = (id: string) => {
    fetch(`/api/summary?society=${id}`).then((r) => r.json()).then(setSummary).catch(() => {});
    fetch(`/api/notices?society=${id}`).then((r) => r.json()).then(setNotices).catch(() => {});
    fetch(`/api/complaints?society=${id}`).then((r) => r.json()).then(setComplaints).catch(() => {});
    fetch(`/api/visitors?society=${id}`).then((r) => r.json()).then(setVisitors).catch(() => {});
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

  async function raiseSos(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setRaisingSos(true);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ society_id: activeId, flat: sosFlat }),
      });
      const data = await res.json();
      setSosAlert(data);
    } finally {
      setRaisingSos(false);
    }
  }

  async function raiseComplaint(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setSavingComplaint(true);
    try {
      await fetch("/api/complaints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...complaintForm, society_id: activeId }),
      });
      setComplaintForm({ flat: "", title: "", category: "general" });
      loadSociety(activeId);
    } finally {
      setSavingComplaint(false);
    }
  }

  async function preApproveVisitor(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setSavingVisitor(true);
    try {
      await fetch("/api/visitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...visitorForm, society_id: activeId }),
      });
      setVisitorForm({ name: "", flat: "", purpose: "Guest" });
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
            <Select value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value)} className="mt-1 w-auto text-lg font-semibold">
              {memberships.map((m) => (
                <option key={m.societyId} value={m.societyId}>{m.name}</option>
              ))}
            </Select>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{active?.name}</h1>
          )}
        </div>
        <LogoutButton />
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
          <form onSubmit={raiseSos} className="flex flex-wrap items-center gap-3">
            <Input required placeholder="Your flat" value={sosFlat} onChange={(e) => setSosFlat(e.target.value)} className="max-w-[10rem]" />
            <Button variant="danger" busy={raisingSos} busyText="Raising SOS…">🚨 Raise SOS</Button>
            <p className="text-sm text-zinc-500">Alerts the society's guard and office-holders immediately.</p>
          </form>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dues</p>
          <p className="mt-1 text-xl font-semibold">{summary ? `₹${summary.dues.toLocaleString("en-IN")}` : "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Open complaints</p>
          <p className="mt-1 text-xl font-semibold">{summary?.openComplaints ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active visitors</p>
          <p className="mt-1 text-xl font-semibold">{summary?.activeVisitors ?? "—"}</p>
        </Card>
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
            <form onSubmit={raiseComplaint} className="grid gap-2">
              <Input required placeholder="Your flat" value={complaintForm.flat} onChange={(e) => setComplaintForm({ ...complaintForm, flat: e.target.value })} />
              <Input required placeholder="What's the issue?" value={complaintForm.title} onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })} />
              <Select value={complaintForm.category} onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}>
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="security">Security</option>
              </Select>
              <Button busy={savingComplaint} busyText="Raising…">Raise complaint</Button>
            </form>
          </Card>
          <div className="mt-3 grid gap-2">
            {complaints.length === 0 ? <p className="text-sm text-zinc-500">No complaints yet.</p> : complaints.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-zinc-500">{c.flat} · {c.category}</p>
                </div>
                <Badge tone={c.status === "resolved" ? "green" : c.status === "in_progress" ? "blue" : "amber"}>{c.status.replace("_", " ")}</Badge>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <PageHeader title="Visitors" />
          <Card>
            <form onSubmit={preApproveVisitor} className="grid gap-2">
              <Input required placeholder="Visitor name" value={visitorForm.name} onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })} />
              <Input required placeholder="Flat to visit" value={visitorForm.flat} onChange={(e) => setVisitorForm({ ...visitorForm, flat: e.target.value })} />
              <Select value={visitorForm.purpose} onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}>
                <option value="Guest">Guest</option>
                <option value="Delivery">Delivery</option>
                <option value="HouseHelp">HouseHelp</option>
                <option value="Home Service">Home Service</option>
              </Select>
              <Button busy={savingVisitor} busyText="Adding…">Pre-approve visitor</Button>
            </form>
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
    </div>
  );
}
