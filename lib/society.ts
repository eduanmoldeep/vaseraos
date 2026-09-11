import { DEFAULT_SOCIETY_ID } from "./cloudflare";

const KEY = "vaseraos-society";

/** Currently selected society (platform-admin tenant switcher). Client-only. */
export function getSelectedSociety(): string {
  if (typeof window === "undefined") return DEFAULT_SOCIETY_ID;
  return window.localStorage.getItem(KEY) ?? DEFAULT_SOCIETY_ID;
}

export function setSelectedSociety(id: string) {
  window.localStorage.setItem(KEY, id);
  // Notify switchers on other tabs/pages.
  window.dispatchEvent(new CustomEvent("vaseraos-society", { detail: id }));
}
