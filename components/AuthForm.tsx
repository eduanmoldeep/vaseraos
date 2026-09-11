"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
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

  const input =
    "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <Card>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium dark:bg-zinc-800">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className={`rounded-lg px-3 py-1.5 capitalize transition ${mode === m ? "bg-white shadow dark:bg-zinc-950" : "text-zinc-500"}`}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input className={input} placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className={input} placeholder="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          className={input}
          placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-teal-800 to-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </Card>
  );
}
