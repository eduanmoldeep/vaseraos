import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore } from "@/lib/cloudflare";
import { requireSocietyMember } from "@/lib/auth";

export const runtime = "nodejs";

type LedgerEntry = {
  id: string;
  type: "income" | "expense";
  label: string;
  amount: number;
  date: string;
  receipt_key: string | null;
};

/** Income (paid dues) + expenses, merged and sorted, with a running balance. */
export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;

  const env = await getEnv();
  let entries: LedgerEntry[];
  type PaidBillRow = { id: string; flat: string; amount: number; month: string; paid_at: string | null; receipt_key: string | null };
  type ExpenseRow = { id: string; vendor: string; category: string; amount: number; created_at: string; receipt_key: string | null };

  if (env?.DB) {
    const { results: paidBills } = await env.DB.prepare(
      "SELECT id, flat, amount, month, paid_at, receipt_key FROM maintenance_bills WHERE society_id = ? AND status = 'paid'"
    ).bind(society_id).all<PaidBillRow>();
    const { results: expenses } = await env.DB.prepare(
      "SELECT id, vendor, category, amount, created_at, receipt_key FROM expenses WHERE society_id = ?"
    ).bind(society_id).all<ExpenseRow>();

    entries = [
      ...((paidBills ?? []) as PaidBillRow[]).map((b) => ({
        id: b.id, type: "income" as const, label: `Maintenance — ${b.flat} (${b.month})`,
        amount: b.amount, date: b.paid_at ?? b.month, receipt_key: b.receipt_key,
      })),
      ...((expenses ?? []) as ExpenseRow[]).map((e) => ({
        id: e.id, type: "expense" as const, label: `${e.vendor} — ${e.category}`,
        amount: e.amount, date: e.created_at, receipt_key: e.receipt_key,
      })),
    ];
  } else {
    const store = mockStore();
    entries = [
      ...store.bills.filter((b) => b.society_id === society_id && b.status === "paid").map((b) => ({
        id: b.id, type: "income" as const, label: `Maintenance — ${b.flat} (${b.month})`,
        amount: b.amount, date: b.paid_at ?? b.month, receipt_key: b.receipt_key ?? null,
      })),
      ...store.expenses.filter((e) => e.society_id === society_id).map((e) => ({
        id: e.id, type: "expense" as const, label: `${e.vendor} — ${e.category}`,
        amount: e.amount, date: e.created_at, receipt_key: e.receipt_key ?? null,
      })),
    ];
  }

  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  const income = entries.filter((e) => e.type === "income").reduce((a, e) => a + e.amount, 0);
  const expenseTotal = entries.filter((e) => e.type === "expense").reduce((a, e) => a + e.amount, 0);
  return NextResponse.json({ income, expenses: expenseTotal, balance: income - expenseTotal, entries });
}
