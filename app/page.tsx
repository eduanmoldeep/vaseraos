"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Button, Card, Input } from "@/components/ui";
import type { AuthUser } from "@/lib/cloudflare";

const FEATURES = [
  { title: "Residents", desc: "Track every flat's owners, tenants and household size in one roster.", dot: "bg-sky-500" },
  { title: "Maintenance", desc: "Raise monthly bills, track dues and mark payments as they come in.", dot: "bg-amber-500" },
  { title: "Complaints", desc: "Log tickets from residents and move them from open to resolved.", dot: "bg-rose-500" },
  { title: "Visitors", desc: "Pre-approve guests and log gate check-ins and check-outs.", dot: "bg-violet-500" },
  { title: "Notices", desc: "Publish announcements the whole society sees the moment they open the app.", dot: "bg-emerald-500" },
  { title: "Societies", desc: "Run more than one society from a single account, fully isolated per tenant.", dot: "bg-teal-500" },
];

type Membership = { societyId: string; name: string; status: string; offices: string[] };

export default function Landing() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const routeAfterAuth = (u: AuthUser) => {
    if (u.admin) {
      setRedirecting(true);
      router.replace("/admin");
      return;
    }
    fetch("/api/me/memberships")
      .then((r) => r.json())
      .then((rows: Membership[]) => {
        if (rows.some((m) => m.offices.length > 0)) {
          setRedirecting(true);
          router.replace("/admin");
        } else if (rows.some((m) => m.status === "approved")) {
          setRedirecting(true);
          router.replace("/app");
        } else {
          setNeedsOnboarding(true);
        }
      })
      .catch(() => setNeedsOnboarding(true));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user ?? null;
        setUser(u);
        if (u) routeAfterAuth(u);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAuthed = (u: AuthUser) => {
    setUser(u);
    routeAfterAuth(u);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setNeedsOnboarding(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white dark:bg-white dark:text-black">
            V
          </span>
          VaseraOS
        </span>
        <span className="hidden text-xs text-zinc-500 sm:inline">Society management, minus the paperwork</span>
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            Residents · Maintenance · Visitors · Notices
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Society management, minus the paperwork.
          </h1>
          <p className="mt-3 max-w-md text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            VaseraOS keeps residents, dues, complaints, gate entries and notices in one fast,
            installable app that works from any phone.
          </p>
          <div className="mt-6 grid max-w-md grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className={`h-2 w-2 shrink-0 rounded-full ${f.dot}`} />
                {f.title}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-sm justify-self-center lg:justify-self-end">
          {!checked || redirecting ? (
            <Card className="animate-pulse">
              <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-3 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
              <div className="mt-2 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
            </Card>
          ) : !user ? (
            <AuthForm onDone={onAuthed} />
          ) : needsOnboarding ? (
            <Onboarding name={user.name} onJoined={() => routeAfterAuth(user)} onLogout={logout} />
          ) : (
            <Card className="animate-pulse">
              <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            </Card>
          )}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-lg font-semibold tracking-tight">Everything a society needs, in one place</h2>
        <p className="mt-1 text-sm text-zinc-500">Six modules, scoped per society, usable from day one.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${f.dot}`} />
                <p className="font-medium">{f.title}</p>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { t: "One app per society", d: "Admins switch between societies; every record stays scoped to its own." },
          { t: "Installable PWA", d: "Add VaseraOS to the home screen — icon, splash and standalone window included." },
          { t: "Fast on any phone", d: "Installs to the home screen and opens instantly on any device." },
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

function Onboarding({ name, onJoined, onLogout }: { name: string; onJoined: () => void; onLogout: () => void }) {
  const [mode, setMode] = useState<"join" | "register">("join");
  const [code, setCode] = useState("");
  const [society, setSociety] = useState({ name: "", city: "", flat: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/societies/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't join that society.");
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join that society.");
    } finally {
      setBusy(false);
    }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/societies/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(society),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't register that society.");
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't register that society.");
    } finally {
      setBusy(false);
    }
  };

  if (registered) {
    return (
      <Card>
        <p className="font-semibold">Registration sent</p>
        <p className="mt-2 text-sm text-zinc-500">
          &ldquo;{society.name}&rdquo; is awaiting approval from a VaseraOS admin. You&apos;ll get admin access
          to it the moment it&apos;s approved — check back here.
        </p>
        <Button variant="ghost" size="sm" onClick={onLogout} className="mt-4">Log out</Button>
      </Card>
    );
  }

  return (
    <Card>
      <p className="font-semibold">Hi {name} 👋</p>
      <p className="mt-1 text-sm text-zinc-500">You&apos;re not part of a society yet.</p>
      <div className="mt-4 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium dark:bg-zinc-800">
        {(["join", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className={`rounded-lg px-3 py-1.5 transition ${mode === m ? "bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {m === "join" ? "I have a code" : "Register a society"}
          </button>
        ))}
      </div>
      {mode === "join" ? (
        <form onSubmit={join} className="mt-4 space-y-3">
          <Input required placeholder="Join code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button variant="accent" className="w-full" busy={busy} busyText="Joining…">Join society</Button>
        </form>
      ) : (
        <form onSubmit={register} className="mt-4 space-y-3">
          <Input required placeholder="Society name" value={society.name} onChange={(e) => setSociety({ ...society, name: e.target.value })} />
          <Input placeholder="City" value={society.city} onChange={(e) => setSociety({ ...society, city: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input required placeholder="Your flat" value={society.flat} onChange={(e) => setSociety({ ...society, flat: e.target.value })} />
            <Input required placeholder="Your phone" value={society.phone} onChange={(e) => setSociety({ ...society, phone: e.target.value })} />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button variant="accent" className="w-full" busy={busy} busyText="Registering…">Register society</Button>
          <p className="text-xs text-zinc-500">
            You&apos;ll be added as its first resident. Requires approval from a VaseraOS admin before it goes live.
          </p>
        </form>
      )}
      <Button variant="ghost" size="sm" onClick={onLogout} className="mt-4">Log out</Button>
    </Card>
  );
}
