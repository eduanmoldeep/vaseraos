import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: "zinc" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{text}</p>;
}
