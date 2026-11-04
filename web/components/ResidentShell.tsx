"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/cloudflare";
import { setSelectedSociety, useSelectedSociety } from "@/lib/society";
import { Icon, type IconName } from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";

export type ResidentMembership = { societyId: string; name: string; status: string; offices: string[]; join_code: string | null };

type ResidentContextValue = {
  viewer: AuthUser;
  memberships: ResidentMembership[];
  /** Selected society id (null while loading / for a platform admin with none picked). */
  society: string | null;
  societyName: string;
  joinCode: string | null;
  /** The viewer's flat in the selected society. `undefined` while loading, `null` when not linked yet. */
  flat: string | null | undefined;
  isOwner: boolean;
  isCommittee: boolean;
  refreshFlat: () => void;
};

const ResidentContext = createContext<ResidentContextValue | null>(null);

export function useResident(): ResidentContextValue {
  const ctx = useContext(ResidentContext);
  if (!ctx) throw new Error("useResident must be used inside <ResidentShell>");
  return ctx;
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/dues", label: "Dues", icon: "wallet" },
  { href: "/complaints", label: "Complaints", icon: "complaint" },
  { href: "/notices", label: "Notices", icon: "megaphone" },
  { href: "/me", label: "Account", icon: "user" },
];

function isActive(pathname: string, href: string) {
  if (href === "/me") return ["/me", "/help", "/feedback"].some((p) => pathname.startsWith(p));
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/ledger");
  return pathname.startsWith(href);
}

/**
 * Frame for every resident screen: society name on top, and one always-visible
 * row of five big labelled tabs (bottom of the screen on phones, under the
 * header on larger screens). Also loads the viewer's societies + flat once and
 * shares them with every page, so pages don't each re-check the same things.
 */
export function ResidentShell({ viewer, isCommittee, children }: { viewer: AuthUser; isCommittee: boolean; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const society = useSelectedSociety();
  const [memberships, setMemberships] = useState<ResidentMembership[]>([]);
  const [flatInfo, setFlatInfo] = useState<{ society: string; flat: string | null; owner: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/me/memberships")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ResidentMembership[]) => {
        const approved = rows.filter((m) => m.status === "approved");
        setMemberships(approved);
        if (approved.length === 0) {
          // Not in any society yet → onboarding (landing page). Platform admins have their own console.
          if (!viewer.admin) router.replace("/");
          else if (pathname === "/app") router.replace("/admin");
          return;
        }
        const current = window.localStorage.getItem("vaseraos-society");
        if (!viewer.admin && !approved.some((m) => m.societyId === current)) setSelectedSociety(approved[0].societyId);
        else if (!current) setSelectedSociety(approved[0].societyId);
      })
      .catch(() => {});
    // Runs once per shell mount — pathname is only read for the initial redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, viewer.admin]);

  const loadFlat = useCallback(() => {
    if (!society) return;
    fetch(`/api/me/flat?society=${society}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFlatInfo({ society, flat: d?.flat ?? null, owner: d?.owner_tenant === "owner" }))
      .catch(() => setFlatInfo({ society, flat: null, owner: false }));
  }, [society]);

  useEffect(() => {
    startTransition(loadFlat);
  }, [loadFlat]);

  const active = memberships.find((m) => m.societyId === society);
  const flatForSociety = flatInfo && flatInfo.society === society ? flatInfo : null;

  const value: ResidentContextValue = {
    viewer,
    memberships,
    society,
    societyName: active?.name ?? "",
    joinCode: active?.join_code ?? null,
    flat: flatForSociety ? flatForSociety.flat : undefined,
    isOwner: flatForSociety?.owner ?? false,
    isCommittee,
    refreshFlat: loadFlat,
  };

  return (
    <ResidentContext.Provider value={value}>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            {(active?.name ?? "V")[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            {memberships.length > 1 ? (
              <label className="block">
                <span className="sr-only">Choose society</span>
                <select
                  value={society ?? ""}
                  onChange={(e) => setSelectedSociety(e.target.value)}
                  className="w-full max-w-full truncate rounded-lg bg-transparent py-1 text-lg font-bold outline-none"
                >
                  {memberships.map((m) => (
                    <option key={m.societyId} value={m.societyId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="truncate text-lg font-bold leading-tight">{active?.name ?? " "}</p>
            )}
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
              {value.flat ? `Flat ${value.flat}` : viewer.name}
            </p>
          </div>
          {isCommittee ? (
            <Link
              href="/admin"
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-300 px-3 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Icon name="grid" className="h-5 w-5" />
              <span>Committee</span>
            </Link>
          ) : null}
          <NotificationBell />
        </div>
        <nav aria-label="Main" className="mx-auto hidden w-full max-w-3xl gap-1 px-4 pb-2 md:flex">
          {NAV.map((n) => {
            const on = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-base font-semibold transition ${
                  on ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon name={n.icon} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main" className="pb-bottom-nav mx-auto w-full max-w-3xl flex-1 px-4 pt-6">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map((n) => {
            const on = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 pb-1.5 pt-2 text-[min(0.8125rem,3.3vw)] font-semibold leading-tight transition ${
                  on ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${on ? "bg-indigo-100 dark:bg-indigo-950/60" : ""}`}>
                  <Icon name={n.icon} className="h-6 w-6" />
                </span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </ResidentContext.Provider>
  );
}
