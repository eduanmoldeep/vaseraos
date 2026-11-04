"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Card, Field, Input, Tabs } from "@/components/ui";
import type { AuthUser } from "@/lib/cloudflare";

type Mode = "login" | "signup";

export function AuthForm({ onDone }: { onDone: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      onDone(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="lg">
      <h2 className="text-2xl font-bold">{mode === "login" ? "Log in" : "Create your account"}</h2>
      <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
        {mode === "login" ? "Welcome back. Log in to see your society." : "It takes a minute. You'll need your society's invite code next."}
      </p>

      <a
        href="/api/auth/google"
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-400 bg-white px-4 text-base font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        Continue with Google
      </a>

      <div className="my-5 flex items-center gap-3 text-base text-zinc-600 dark:text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or use your email
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <Tabs<Mode>
        label="Log in or sign up"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError("");
        }}
        tabs={[
          { id: "login", label: "I have an account" },
          { id: "signup", label: "I'm new here" },
        ]}
      />

      <form onSubmit={submit} className="mt-5 grid gap-4">
        {mode === "signup" ? (
          <Field label="Your full name">
            <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
        ) : null}
        <Field label="Email address">
          <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor={passwordId} hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-24"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-1 right-1 min-w-20 rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-base text-red-900 dark:bg-red-950/40 dark:text-red-200">
            <Icon name="alert" className="mt-0.5 h-5 w-5" />
            {error}
          </p>
        ) : null}
        <Button variant="accent" size="lg" className="w-full" busy={busy} busyText="Please wait…">
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
    </Card>
  );
}
