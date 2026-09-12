"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Empty, ErrorBanner, Input, ListSkeleton, PageHeader } from "@/components/ui";
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

  async function add(e: React.FormEvent) {
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
      <PageHeader title="Users" subtitle="Every account with a VaseraOS login. Admin is granted only via direct DB access." />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input required type="password" placeholder="Password (8+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button busy={saving} busyText="Adding…">Add user</Button>
        </form>
      </Card>
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
                <p className="font-medium">
                  {u.name}
                  {u.id === self ? <span className="ml-2 text-xs font-normal text-zinc-500">· you</span> : null}
                </p>
                <p className="text-xs text-zinc-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.admin ? <Badge tone="blue">admin</Badge> : null}
                {u.id !== self ? (
                  <Button variant="secondary" size="sm" busy={impersonating === u.id} busyText="Logging in…" onClick={() => loginAs(u.id)}>
                    Login as →
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
