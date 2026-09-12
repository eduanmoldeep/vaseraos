"use client";

import { useEffect, useRef, useState } from "react";
import { getSelectedSociety } from "@/lib/society";
import { Button } from "./ui";

type SosAlert = { id: string; flat: string; status: "open" | "acknowledged" | "resolved"; created_at: string };

/**
 * Always-mounted in the admin section. Polls for open SOS alerts in the
 * selected society and, on finding one, loops a siren + blocks with a
 * full-screen "Acknowledge" modal until an office-holder resolves it. This is
 * the web-side "foreground siren" tier — the guard app carries the real
 * locked-screen alarm.
 */
export function SosWatcher() {
  const [active, setActive] = useState<SosAlert | null>(null);
  const [resolving, setResolving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      const society = getSelectedSociety();
      if (!society) return;
      fetch(`/api/sos?society=${society}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: SosAlert[]) => {
          if (cancelled) return;
          const open = rows.find((r) => r.status === "open" || r.status === "acknowledged");
          if (open) setActive(open);
          else setActive((prev) => (prev && !rows.some((r) => r.id === prev.id) ? null : prev));
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 6000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [active]);

  async function resolve() {
    if (!active) return;
    setResolving(true);
    try {
      await fetch(`/api/sos/${active.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      });
      setActive(null);
    } finally {
      setResolving(false);
    }
  }

  return (
    <>
      <audio ref={audioRef} src="/siren.wav" loop />
      {active ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">SOS alarm</p>
            <p className="mt-2 text-xl font-semibold">
              {active.status === "acknowledged" ? "Guard is on the way" : "Resident needs help"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">Flat {active.flat}</p>
            <Button variant="danger" className="mt-6 w-full" busy={resolving} busyText="Resolving…" onClick={resolve}>
              Mark resolved
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
