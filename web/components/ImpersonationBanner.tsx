"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/cloudflare";

/** Sticky banner shown whenever an admin is viewing the app as another user. */
export function ImpersonationBanner() {
  const router = useRouter();
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<AuthUser | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setViewer(d?.user ?? null);
        setAdmin(d?.impersonatedBy ?? null);
      })
      .catch(() => {});
  }, []);

  if (!admin) return null;

  const back = async () => {
    setReturning(true);
    await fetch("/api/auth/stop-impersonate", { method: "POST" }).catch(() => {});
    setAdmin(null);
    router.push("/admin");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>
        Logged in as <strong>{viewer?.name}</strong> — impersonated by {admin.name}
      </span>
      <button
        onClick={back}
        disabled={returning}
        className="rounded-lg bg-amber-950/10 px-3 py-1 text-xs font-semibold hover:bg-amber-950/20 disabled:opacity-60"
      >
        {returning ? "Returning…" : "Back to admin"}
      </button>
    </div>
  );
}
