import { useSyncExternalStore } from "react";
import { TEXT_SIZE_KEY as KEY } from "@/lib/textSizeScript";

/**
 * Per-device text size preference. Applied as `data-text-size` on <html>, which
 * scales the root font-size — and since every Tailwind size/spacing is in rem,
 * the whole interface (text, buttons, gaps) grows together.
 */
export type TextSize = "normal" | "large" | "xlarge";

const EVENT = "vaseraos-text-size";

function read(): TextSize {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "large" || v === "xlarge" ? v : "normal";
  } catch {
    return "normal";
  }
}

export function setTextSize(size: TextSize) {
  try {
    if (size === "normal") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, size);
  } catch {
    // storage blocked (private mode) — still apply for this visit
  }
  if (size === "normal") delete document.documentElement.dataset.textSize;
  else document.documentElement.dataset.textSize = size;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, read, () => "normal");
}
