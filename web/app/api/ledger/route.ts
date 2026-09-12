import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore } from "@/lib/cloudflare";
import { getViewer, requireSocietyMember } from "@/lib/auth";
import { getMyResident, getOffices } from "@/lib/membership";

export const runtime = "nodejs";

type LedgerEntry = {
  id: string;
  type: "income" | "expense";
  label: string;
  amount: number;
  date: string;
  receipt_key: string | null;
};

/**
 * Income (paid dues) + expenses, merged and sorted, with a running balance.
 * Plain residents only see this when they own their flat — tenants don't get
 * visibility into society finances. Office bearers and platform admins always
 * see it, regardless of their own owner/tenant status, since running the
 * ledger is their job.
 */
export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;

  const viewer = (await getViewer())!; // requireSocietyMember already confirmed a logged-in viewer
  if (!viewer.admin) {
    const offices = await getOffices(viewer.id, society_id);
    if (offices.length === 0) {
      const resident = await getMyResident(viewer.id, viewer.email, society_id);
      if (resident?.owner_tenant !== "owner") {
        return NextResponse.json({ error: "The society ledger is visible to flat owners only." }, { status: 403 });
      }
    }
  }

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
