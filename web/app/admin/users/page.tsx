"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddPanel } from "@/components/AddPanel";
import { Badge, Button, Card, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader } from "@/components/ui";
import type { AuthUser } from "@/lib/cloudflare";

type UserRow = AuthUser & { createdAt: string };

export default function UsersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [self, setSelf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/users")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load users."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load users."))
      .finally(() => setLoading(false));
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSelf(d?.user?.id ?? null))
      .catch(() => {});
  }, []);

  async function add(e: React.FormEvent, close: () => void) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add user.");
      setForm({ name: "", email: "", password: "" });
      close();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add user.");
    } finally {
      setSaving(false);
    }
  }

  async function loginAs(id: string) {
    setImpersonating(id);
    try {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setError("Couldn't log in as that user.");
      setImpersonating(null);
    }
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Every account with a VaseraOS login. Platform admin can only be granted directly in the database." />
      <AddPanel label="Add a user" icon="user">
        {(close) => (
          <form onSubmit={(e) => add(e, close)} className="grid gap-4 sm:grid-cols-3">
            <Field label="Full name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Email">
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password" hint="At least 8 characters.">
              <Input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Button icon="check" busy={saving} busyText="Adding…" className="sm:col-span-3 sm:w-fit">Add user</Button>
          </form>
        )}
      </AddPanel>
      {error ? <div className="my-4"><ErrorBanner text={error} onRetry={load} /></div> : null}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No users yet." />
        ) : (
          rows.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {u.name}
                  {u.id === self ? <span className="ml-2 text-base font-normal text-zinc-600 dark:text-zinc-400">(you)</span> : null}
                </p>
                <p className="text-base text-zinc-600 dark:text-zinc-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.admin ? <Badge tone="blue">admin</Badge> : null}
                {u.id !== self ? (
                  <Button variant="secondary" size="sm" busy={impersonating === u.id} busyText="Logging in…" onClick={() => loginAs(u.id)}>
                    Log in as them
                  </Button>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
