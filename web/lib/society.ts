import { useSyncExternalStore } from "react";

const KEY = "vaseraos-society";
const EVENT = "vaseraos-society";

/** Explicitly selected society (platform-admin tenant switcher). Client-only.
 * Null until the admin picks one — pages show a prompt instead of data. */
export function getSelectedSociety(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setSelectedSociety(id: string | null) {
  if (id === null) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, id);
  // Notify switchers on other tabs/pages.
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getServerSnapshot() {
  return null;
}

/**
 * Reactive read of the selected society, in sync with `setSelectedSociety`
 * calls anywhere (including other tabs' switcher). `useSyncExternalStore`'s
 * server snapshot (`null`) matches SSR output exactly, so — unlike a
 * `useState(() => getSelectedSociety())` initializer, which reads localStorage
 * during the client's first render and mismatches the server's null-render —
 * this never trips a hydration error when a society is already selected.
 */
export function useSelectedSociety(): string | null {
  return useSyncExternalStore(subscribe, getSelectedSociety, getServerSnapshot);
}
