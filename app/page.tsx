"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Badge, Card } from "@/components/ui";
import type { AuthUser } from "@/lib/cloudflare";

const FEATURES = [
  { title: "Residents", desc: "Flats, owners, tenants & members", color: "bg-sky-500" },
  { title: "Maintenance", desc: "Bills, dues & collection", color: "bg-amber-500" },
  { title: "Complaints", desc: "Tickets & resolution status", color: "bg-rose-500" },
  { title: "Visitors", desc: "Gate entries & check-ins", color: "bg-violet-500" },
  { title: "Notices", desc: "Announcements with attachments", color: "bg-emerald-500" },
  { title: "Societies", desc: "Multi-society admin switching", color: "bg-teal-500" },
];

export default function Landing() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-800 p-6 text-white shadow-md sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <Badge tone="green">Residents · Maintenance · Visitors · Notices</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Society management, minus the paperwork.
            </h1>
            <p className="mt-3 max-w-md text-sm text-teal-100/85 sm:text-base">
              VaseraOS keeps residents, dues, complaints, gate entries and notices in one fast,
              installable app that works from any phone.
            </p>
            <div className="mt-5 grid max-w-md grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${f.color}`} />
                  {f.title}
                </div>
              ))}
            </div>
          </div>
          <div className="w-full max-w-sm justify-self-center lg:justify-self-end">
            {!checked ? (
              <Card><p className="py-6 text-center text-sm text-zinc-500">Loading…</p></Card>
            ) : !user ? (
              <AuthForm onDone={setUser} />
            ) : user.admin ? (
              <Card>
                <p className="text-sm text-zinc-500">Signed in as</p>
                <p className="mt-1 font-semibold">{user.name}</p>
                <Link
                  href="/admin"
                  className="mt-4 block rounded-xl bg-gradient-to-r from-teal-800 to-emerald-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow hover:brightness-110"
                >
                  Open admin dashboard →
                </Link>
                <button onClick={logout} className="mt-2 w-full py-1 text-xs text-zinc-500 underline">
                  Log out
                </button>
              </Card>
            ) : (
              <Card>
                <p className="font-semibold">Hi {user.name} 👋</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Your account is created. The management modules are admin-only — ask your society
                  admin to enable access for {user.email}.
                </p>
                <button onClick={logout} className="mt-4 text-sm font-medium underline">
                  Log out
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { t: "One app per society", d: "Admins switch between societies; every record stays scoped to its own." },
          { t: "Installable PWA", d: "Add VaseraOS to the home screen — icon, splash and standalone window included." },
          { t: "Runs on Cloudflare", d: "Workers + D1 + R2 + KV: fast, global, and near-zero to operate." },
        ].map((c) => (
          <Card key={c.t}>
            <p className="font-medium">{c.t}</p>
            <p className="mt-1 text-sm text-zinc-500">{c.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
