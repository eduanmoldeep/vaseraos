"use client";

import { setTextSize, useTextSize, type TextSize } from "@/lib/textSize";

const OPTIONS: { id: TextSize; label: string; sample: string }[] = [
  { id: "normal", label: "Normal", sample: "text-base" },
  { id: "large", label: "Large", sample: "text-lg" },
  { id: "xlarge", label: "Extra large", sample: "text-xl" },
];

/** Three big buttons — each written in the size it applies — to choose how large all text appears. */
export function TextSizeControl() {
  const current = useTextSize();
  return (
    <div role="group" aria-label="Text size" className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => {
        const active = o.id === current;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => setTextSize(o.id)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 font-semibold transition ${
              active
                ? "border-indigo-600 bg-indigo-50 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-100"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
            }`}
          >
            <span className={`${o.sample} leading-none`} aria-hidden>
              Aa
            </span>
            <span className="mt-1 text-sm">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
