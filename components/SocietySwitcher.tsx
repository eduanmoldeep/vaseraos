"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Society } from "@/lib/cloudflare";
import { getSelectedSociety, setSelectedSociety } from "@/lib/society";

/** Platform-admin tenant switcher: pick which society's data all pages show. */
export function SocietySwitcher() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [current, setCurrent] = useState<string>(getSelectedSociety());

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((rows: Society[]) => {
        setSocieties(rows);
        // If the stored id no longer exists, fall back to the first society.
        if (rows.length > 0 && !rows.some((s) => s.id === getSelectedSociety())) {
          setSelectedSociety(rows[0].id);
          setCurrent(rows[0].id);
        }
      })
      .catch(() => {});
    const onChange = (e: Event) => setCurrent((e as CustomEvent<string>).detail);
    window.addEventListener("vaseraos-society", onChange);
    return () => window.removeEventListener("vaseraos-society", onChange);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        onChange={(e) => {
          setSelectedSociety(e.target.value);
          setCurrent(e.target.value);
          // Reload so every module refetches scoped data.
          window.location.reload();
        }}
        className="max-w-44 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
        aria-label="Select society"
      >
        {societies.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Link
        href="/admin/societies"
        className="rounded-full px-2 py-1.5 text-xs font-medium text-zinc-500 underline hover:text-zinc-900 dark:hover:text-white"
      >
        Manage
      </Link>
    </div>
  );
}
