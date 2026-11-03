/**
 * Plain-language wording for every status, period and amount the UI shows.
 * Raw API values ("pending_verification", "2026-09", "in_progress") never reach
 * the screen directly — residents (many of them elderly) see everyday words.
 */

export type Tone = "zinc" | "green" | "amber" | "red" | "blue";

/** ₹ amount with Indian digit grouping; negatives read "−₹1,800", not "₹-1,800". */
export function inr(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-IN");
  return n < 0 ? `−₹${abs}` : `₹${abs}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const QUARTERS: Record<string, string> = { Q1: "Jan – Mar", Q2: "Apr – Jun", Q3: "Jul – Sep", Q4: "Oct – Dec" };

/** Bill period label → words. "2026-09" → "September 2026", "2026-Q3" → "Jul – Sep 2026", "2026" → "Year 2026". */
export function formatPeriod(period: string): string {
  const monthly = /^(\d{4})-(\d{2})$/.exec(period);
  if (monthly) {
    const m = Number(monthly[2]);
    if (m >= 1 && m <= 12) return `${MONTHS[m - 1]} ${monthly[1]}`;
  }
  const quarterly = /^(\d{4})-(Q[1-4])$/.exec(period);
  if (quarterly) return `${QUARTERS[quarterly[2]]} ${quarterly[1]}`;
  if (/^\d{4}$/.test(period)) return `Year ${period}`;
  return period;
}

/** "3 Nov 2026" — short, unambiguous, no locale-dependent day/month order. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function timeAgo(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type StatusInfo = { label: string; tone: Tone };

export const BILL_STATUS: Record<string, StatusInfo> = {
  pending: { label: "Not paid yet", tone: "amber" },
  overdue: { label: "Overdue", tone: "red" },
  pending_verification: { label: "Checking payment", tone: "blue" },
  paid: { label: "Paid", tone: "green" },
};

export const COMPLAINT_STATUS: Record<string, StatusInfo> = {
  open: { label: "Received", tone: "amber" },
  in_progress: { label: "Being fixed", tone: "blue" },
  resolved: { label: "Resolved", tone: "green" },
};

export const VISITOR_STATUS: Record<string, StatusInfo> = {
  expected: { label: "Expected", tone: "blue" },
  checked_in: { label: "Inside", tone: "green" },
  checked_out: { label: "Left", tone: "zinc" },
};

export const TICKET_STATUS: Record<string, StatusInfo> = {
  open: { label: "Waiting for reply", tone: "amber" },
  resolved: { label: "Resolved", tone: "green" },
};

export function statusOf(map: Record<string, StatusInfo>, status: string): StatusInfo {
  return map[status] ?? { label: status.replace(/_/g, " "), tone: "zinc" };
}

/** Values stay what the API already stores; only the wording is friendlier. */
export const COMPLAINT_CATEGORIES = [
  { value: "plumbing", label: "Water / plumbing" },
  { value: "electrical", label: "Electricity / lights" },
  { value: "maintenance", label: "Repairs / lift" },
  { value: "security", label: "Safety / security" },
  { value: "general", label: "Something else" },
] as const;

export const VISITOR_PURPOSES = [
  { value: "Guest", label: "Guest" },
  { value: "Delivery", label: "Delivery" },
  { value: "HouseHelp", label: "House help" },
  { value: "Home Service", label: "Repair / service" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance & repairs" },
  { value: "utilities", label: "Electricity & water bills" },
  { value: "staff", label: "Staff salaries" },
  { value: "security", label: "Security" },
] as const;

export function labelFor(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((o) => o.value === value)?.label ?? value;
}
