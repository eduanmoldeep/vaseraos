const KEY = "vaseraos-society";

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
  window.dispatchEvent(new CustomEvent("vaseraos-society", { detail: id }));
}
