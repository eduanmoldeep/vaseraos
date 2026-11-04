"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Society } from "@/lib/cloudflare";
import { getSelectedSociety, setSelectedSociety, useSelectedSociety } from "@/lib/society";

/**
 * The app's identity control: shows the active society (not the VaseraOS brand)
 * as a workspace-style switcher, since every screen is scoped to one society.
 * With only one society it's plain text — no pointless dropdown.
 */
export function SocietySwitcher({ compact = false }: { compact?: boolean }) {
  const [societies, setSocieties] = useState<Society[]>([]);
  const current = useSelectedSociety();

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((rows: Society[]) => {
        setSocieties(rows);
        const stored = getSelectedSociety();
        const usable = rows.filter((s) => s.status !== "pending" && s.status !== "rejected");
        if (stored && rows.length > 0 && !rows.some((s) => s.id === stored)) {
          setSelectedSociety(usable[0]?.id ?? null);
        } else if (!stored && usable.length === 1) {
          // Only one society to run — pick it so pages don't open on "select a society".
          setSelectedSociety(usable[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const name = societies.find((s) => s.id === current)?.name ?? "";
  const initial = name ? name[0].toUpperCase() : "?";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className={`flex ${compact ? "h-9 w-9" : "h-10 w-10"} shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white`}>
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        {societies.length > 1 || !current ? (
          <label className="block">
            <span className="sr-only">Choose society</span>
            <select
              value={current ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                setSelectedSociety(id);
                window.location.reload();
              }}
              className="w-full max-w-52 truncate rounded-lg bg-transparent py-1 text-lg font-bold text-zinc-950 outline-none dark:text-zinc-50"
            >
              <option value="">Choose society…</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="truncate text-lg font-bold">{name}</p>
        )}
        {!compact ? (
          <Link href="/admin/societies" className="block text-sm text-zinc-600 hover:text-indigo-700 hover:underline dark:text-zinc-400">
            Manage societies
          </Link>
        ) : null}
      </div>
    </div>
  );
}
