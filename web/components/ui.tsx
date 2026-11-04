import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/icons";
import type { Tone } from "@/lib/labels";

/*
 * Shared UI kit. Sizing is deliberately generous so the app is comfortable for
 * elderly residents: 16px+ body text, 48px tap targets, visible labels on every
 * field (never placeholder-only), and plain-language status words.
 */

type CardTone = "default" | "amber" | "green" | "red" | "indigo";

const cardToneClass: Record<CardTone, string> = {
  default: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
  amber: "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
  green: "border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/30",
  red: "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
  indigo: "border-indigo-300 bg-white ring-4 ring-indigo-600/10 dark:border-indigo-800 dark:bg-zinc-950",
};

const cardPaddingClass = { none: "", sm: "p-2", md: "p-5", lg: "p-6" } as const;

/** Surface container. Use `tone`/`padding` (not className) for colour and padding, so they never fight the defaults. */
export function Card({
  children,
  className = "",
  id,
  tone = "default",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: CardTone;
  padding?: keyof typeof cardPaddingClass;
}) {
  return (
    <div id={id} className={`rounded-2xl border text-zinc-950 dark:text-zinc-50 ${cardPaddingClass[padding]} ${cardToneClass[tone]} ${className}`}>
      {children}
    </div>
  );
}

const toneClass: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  green: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  red: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
};

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${toneClass[tone]}`}>{children}</span>;
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back ? (
        <Link
          href={back.href}
          className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
        >
          <Icon name="chevronLeft" className="h-5 w-5" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-base text-zinc-600 dark:text-zinc-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

/** Titled block inside a page — keeps every screen to a few clearly-named sections. */
export function Section({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mt-8 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 px-5 py-8 text-center dark:border-zinc-700">
      <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">{text}</p>
      {hint ? <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export const fieldClass =
  "w-full min-h-12 rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-base text-zinc-950 outline-none transition placeholder:text-zinc-500 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400";

/**
 * Visible label + optional hint around any control. Labels never disappear while typing.
 * Pass `htmlFor` (matching the control's id) when the children include anything besides
 * the control itself — e.g. a "Show password" button — so it doesn't leak into the field's name.
 */
export function Field({
  label,
  hint,
  optional = false,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  const caption = (
    <>
      {label}
      {optional ? <span className="font-normal text-zinc-600 dark:text-zinc-400"> (optional)</span> : null}
    </>
  );
  const hintEl = hint ? <span className="text-sm text-zinc-600 dark:text-zinc-400">{hint}</span> : null;
  if (htmlFor) {
    return (
      <div className={`grid gap-1.5 ${className}`}>
        <label htmlFor={htmlFor} className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {caption}
        </label>
        {children}
        {hintEl}
      </div>
    );
  }
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{caption}</span>
      {children}
      {hintEl}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`${fieldClass} ${className}`} {...props}>
      {children}
    </select>
  );
}

/** A big, obvious "choose a photo/file" control showing the chosen file's name. */
export function FilePicker({
  label,
  file,
  onChange,
  accept = "image/*",
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-zinc-400 px-4 py-3 text-base transition hover:border-indigo-500 hover:bg-indigo-50/50 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/20 dark:border-zinc-600 dark:hover:bg-indigo-950/20">
      <Icon name={file ? "check" : "upload"} className={`h-6 w-6 ${file ? "text-green-600" : "text-zinc-600 dark:text-zinc-400"}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{file ? "Photo chosen" : label}</span>
        <span className="block truncate text-sm text-zinc-600 dark:text-zinc-400">{file ? `${file.name} — tap to change` : "Tap to choose from your phone"}</span>
      </span>
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

type ButtonVariant = "primary" | "accent" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
  accent: "bg-indigo-600 text-white hover:bg-indigo-500",
  secondary: "border border-zinc-400 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800",
  danger: "text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
  ghost: "text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  busyText,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  busyText?: string;
  icon?: IconName;
}) {
  return (
    <button disabled={disabled || busy} className={buttonClass(variant, size, className)} {...props}>
      {busy ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {busy && busyText ? busyText : children}
    </button>
  );
}

/** A Next.js link that looks like a button — for "Pay now →" style navigation. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </Link>
  );
}

export function ErrorBanner({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-base text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
      <span className="flex items-start gap-2">
        <Icon name="alert" className="mt-0.5 h-5 w-5" />
        {text}
      </span>
      {onRetry ? (
        <button onClick={onRetry} className="min-h-10 rounded-lg px-2 font-semibold underline underline-offset-4">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function SuccessBanner({ text, onClose }: { text: string; onClose?: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-base text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200">
      <span className="flex items-start gap-2">
        <Icon name="check" className="mt-0.5 h-5 w-5" />
        {text}
      </span>
      {onClose ? (
        <button onClick={onClose} aria-label="Dismiss" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40">
          <Icon name="x" />
        </button>
      ) : null}
    </div>
  );
}

/** Segmented filter (e.g. "To approve · Unpaid · Paid"). Familiar, large, and shows counts. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-900">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={`flex min-h-11 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-base font-semibold transition ${
              active ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white" : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className={`rounded-full px-2 text-sm ${active ? "bg-zinc-200 dark:bg-zinc-700" : "bg-zinc-200/70 dark:bg-zinc-800"}`}>{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Big tappable radio choices — easier than a dropdown for picking one of a few options. */
export function ChoiceGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 min-[380px]:grid-cols-2"}`}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={o.value}
            className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3.5 py-2 text-base font-medium transition focus-within:ring-4 focus-within:ring-indigo-600/20 ${
              checked
                ? "border-indigo-600 bg-indigo-50 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-100"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-indigo-600 dark:border-indigo-400" : "border-zinc-400"}`}
            >
              {checked ? <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" /> : null}
            </span>
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

/** On/off pill with a visible check mark — used for committee roles. */
export function ToggleChip({ on, busy, onClick, children, label }: { on: boolean; busy?: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-medium transition disabled:opacity-50 ${
        on
          ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
          : "border-zinc-300 text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-200"
      }`}
    >
      {busy ? <Spinner className="h-4 w-4" /> : <Icon name={on ? "check" : "plus"} className="h-4 w-4" strokeWidth={2.4} />}
      {children}
    </button>
  );
}

/** Large number with a caption; optionally a link. */
export function Stat({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: string; href?: string; tone?: "good" | "bad" }) {
  const body = (
    <>
      <p className="text-base font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${tone === "good" ? "text-green-700 dark:text-green-400" : tone === "bad" ? "text-red-700 dark:text-red-400" : ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600">
      {body}
    </Link>
  ) : (
    <Card>{body}</Card>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900" />
        </Card>
      ))}
    </div>
  );
}

/** Tap-to-call link for phone numbers. */
export function PhoneLink({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300">
      <Icon name="phone" className="h-4 w-4" />
      {phone}
    </a>
  );
}
