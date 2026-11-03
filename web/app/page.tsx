"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Icon, type IconName } from "@/components/icons";
import { Button, Card, ErrorBanner, Field, Input, Tabs } from "@/components/ui";
import type { AuthUser } from "@/lib/cloudflare";

const FEATURES: { title: string; desc: string; icon: IconName }[] = [
  { title: "Emergency SOS", desc: "One button alerts the guard and committee.", icon: "alert" },
  { title: "Pay maintenance", desc: "Pay by UPI and send the receipt in a few taps.", icon: "wallet" },
  { title: "Report problems", desc: "Tell the committee and follow the repair.", icon: "wrench" },
  { title: "Notices", desc: "Society announcements, straight to your phone.", icon: "megaphone" },
  { title: "Visitors", desc: "Let the gate know who is coming.", icon: "door" },
  { title: "Committee tools", desc: "Residents, dues, accounts and guards in one place.", icon: "users" },
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
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-lg font-bold text-white dark:bg-white dark:text-black">
          V
        </span>
        <span>
          <span className="block text-xl font-bold leading-tight">VaseraOS</span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">Your housing society, in one app</span>
        </span>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_28rem]">
        {/* Sign-in comes first on phones — that's what almost everyone opening this page is here to do. */}
        <div className="w-full lg:order-2">
          {!checked || redirecting ? (
            <Card padding="lg" className="animate-pulse">
              <div className="h-6 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-5 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="mt-3 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="mt-3 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            </Card>
          ) : !user ? (
            <AuthForm onDone={onAuthed} />
          ) : needsOnboarding ? (
            <Onboarding name={user.name} onJoined={() => routeAfterAuth(user)} onLogout={logout} />
          ) : (
            <Card padding="lg" className="animate-pulse">
              <div className="h-6 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            </Card>
          )}
        </div>

        <div className="lg:order-1 lg:pt-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Society management, minus the paperwork.</h1>
          <p className="mt-3 max-w-xl text-lg text-zinc-700 dark:text-zinc-300">
            Pay maintenance, report problems, read notices and call the guard in an emergency — all from your phone.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  <Icon name={f.icon} />
                </span>
                <span>
                  <span className="block text-lg font-semibold">{f.title}</span>
                  <span className="block text-base text-zinc-600 dark:text-zinc-400">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-12 text-center text-sm text-zinc-500 dark:text-zinc-400">VaseraOS · Society management</p>
    </main>
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
      <Card padding="lg">
        <h2 className="text-2xl font-bold">Request sent</h2>
        <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">
          &ldquo;{society.name}&rdquo; is waiting for approval from the VaseraOS team. Come back to this page later — once it&apos;s
          approved you&apos;ll be able to run it from here.
        </p>
        <Button variant="secondary" icon="logout" onClick={onLogout} className="mt-5 w-full">Log out</Button>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <h2 className="text-2xl font-bold">Welcome, {name.split(" ")[0]}</h2>
      <p className="mt-1 text-lg text-zinc-700 dark:text-zinc-300">One last step: join your society.</p>
      <div className="mt-5">
        <Tabs<"join" | "register">
          label="Join or register"
          value={mode}
          onChange={(m) => { setMode(m); setError(""); }}
          tabs={[
            { id: "join", label: "I have a code" },
            { id: "register", label: "New society" },
          ]}
        />
      </div>
      {mode === "join" ? (
        <form onSubmit={join} className="mt-5 grid gap-4">
          <Field label="Invite code" hint="Ask your society committee or a neighbour — it looks like GREEN01.">
            <Input
              required
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-xl tracking-widest"
            />
          </Field>
          {error ? <ErrorBanner text={error} /> : null}
          <Button variant="accent" size="lg" className="w-full" busy={busy} busyText="Joining…">Join my society</Button>
        </form>
      ) : (
        <form onSubmit={register} className="mt-5 grid gap-4">
          <p className="text-base text-zinc-600 dark:text-zinc-400">For committee members setting up their society on VaseraOS for the first time.</p>
          <Field label="Society name">
            <Input required value={society.name} onChange={(e) => setSociety({ ...society, name: e.target.value })} />
          </Field>
          <Field label="City" optional>
            <Input value={society.city} onChange={(e) => setSociety({ ...society, city: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your flat">
              <Input required value={society.flat} onChange={(e) => setSociety({ ...society, flat: e.target.value })} placeholder="A-101" />
            </Field>
            <Field label="Your phone">
              <Input required type="tel" inputMode="tel" value={society.phone} onChange={(e) => setSociety({ ...society, phone: e.target.value })} />
            </Field>
          </div>
          {error ? <ErrorBanner text={error} /> : null}
          <Button variant="accent" size="lg" className="w-full" busy={busy} busyText="Sending…">Send for approval</Button>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You&apos;ll be added as its first resident. The VaseraOS team approves new societies before they go live.
          </p>
        </form>
      )}
      <Button variant="ghost" onClick={onLogout} className="mt-4">Log out</Button>
    </Card>
  );
}
