"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Society } from "@/lib/cloudflare";
import { getSelectedSociety, setSelectedSociety } from "@/lib/society";

/**
 * The app's identity control: shows the active society (not the VaseraOS brand)
 * as a workspace-style switcher, since every screen is scoped to one society.
 */
export function SocietySwitcher({ compact = false }: { compact?: boolean }) {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [current, setCurrent] = useState<string | null>(() => getSelectedSociety());

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((rows: Society[]) => {
        setSocieties(rows);
        const stored = getSelectedSociety();
        if (stored && rows.length > 0 && !rows.some((s) => s.id === stored)) {
          setSelectedSociety(null);
          setCurrent(null);
        }
      })
      .catch(() => {});
    const onChange = (e: Event) => setCurrent((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener("vaseraos-society", onChange);
    return () => window.removeEventListener("vaseraos-society", onChange);
  }, []);

  const name = societies.find((s) => s.id === current)?.name ?? "";
  const initial = name ? name[0].toUpperCase() : "?";

  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center gap-2.5"}>
      <span className={`flex ${compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"} shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white`}>
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <select
          value={current ?? ""}
          onChange={(e) => {
            const id = e.target.value || null;
            setSelectedSociety(id);
            setCurrent(id);
            window.location.reload();
          }}
          className="w-full max-w-44 truncate bg-transparent text-sm font-semibold text-zinc-900 outline-none dark:text-zinc-50"
          aria-label="Select society"
        >
          <option value="">Select society</option>
          {societies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {!compact ? (
          <Link href="/admin/societies" className="block text-xs text-zinc-500 hover:text-indigo-600 hover:underline dark:text-zinc-400">
            Manage societies
          </Link>
        ) : null}
      </div>
    </div>
  );
}
