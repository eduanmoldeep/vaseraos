"use client";

import { startTransition, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Spinner } from "@/components/ui";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** "Alerts on this phone" on/off switch. Handles its own subscribe state; explains when it can't work. */
export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    startTransition(() => {
      setSupported(ok);
      if (!ok) return;
      fetch("/api/push/subscribe")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setSubscribed(!!d?.subscribed))
        .catch(() => {});
    });
  }, []);

  async function enable() {
    setBusy(true);
    setNote("");
    try {
      const keyRes = await fetch("/api/push/public-key").then((r) => r.json());
      if (!keyRes?.key) {
        setNote("Alerts aren't available yet for this app.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNote("Your phone blocked alerts. Allow notifications for this site in your browser settings, then try again.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.key) as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } catch {
      setNote("Couldn't turn on alerts on this phone. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;
  if (!supported) {
    return (
      <p className="text-base text-zinc-600 dark:text-zinc-400">
        This browser can&apos;t show alerts. On iPhone, first add this app to your Home Screen (Share → Add to Home Screen) and open it from there.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={subscribed}
        disabled={busy}
        onClick={() => (subscribed ? disable() : enable())}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-1 text-left text-base disabled:opacity-60"
      >
        <Icon name="bell" className="h-6 w-6" />
        <span className="flex-1">
          <span className="block font-semibold">Alerts on this phone</span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">{subscribed ? "On — you'll get notices and reminders" : "Off"}</span>
        </span>
        {busy ? <Spinner /> : null}
        <span aria-hidden className={`relative h-8 w-14 shrink-0 rounded-full transition ${subscribed ? "bg-green-600" : "bg-zinc-300 dark:bg-zinc-700"}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${subscribed ? "left-7" : "left-1"}`} />
        </span>
      </button>
      {note ? <p className="mt-2 text-sm text-red-700 dark:text-red-400">{note}</p> : null}
    </div>
  );
}
