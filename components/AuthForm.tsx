"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { AuthUser } from "@/lib/cloudflare";

export function AuthForm({ onDone }: { onDone: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      onDone(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium dark:bg-zinc-800">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className={`rounded-lg px-3 py-1.5 capitalize transition ${mode === m ? "bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <Input placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <Input placeholder="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <Button variant="accent" className="w-full" busy={busy} busyText="Please wait…">
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
    </Card>
  );
}
