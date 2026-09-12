import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore, uid, type Expense } from "@/lib/cloudflare";
import { getViewer, requireSocietyMember, requireSocietyOffice } from "@/lib/auth";
import { storeReceipt } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM expenses WHERE society_id = ? ORDER BY created_at DESC")
      .bind(society_id)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().expenses.filter((e) => e.society_id === society_id));
}

// Logging an expense is the treasurer's job — same office that owns the maintenance dues config.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Send multipart/form-data." }, { status: 400 });
  const society_id = String(form.get("society_id") ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyOffice(society_id, "treasurer");
  if (denied) return denied;

  const vendor = String(form.get("vendor") ?? "").trim();
  const amount = Number(form.get("amount") ?? 0);
  if (!vendor || !(amount > 0)) return NextResponse.json({ error: "Provide a vendor and an amount > 0." }, { status: 400 });

  let receipt_key: string | undefined;
  try {
    receipt_key = await storeReceipt(society_id, form.get("receipt") as File | null);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't store receipt." }, { status: 400 });
  }

  const viewer = await getViewer();
  const expense: Expense = {
    id: uid("e"),
    society_id,
    category: String(form.get("category") ?? "general"),
    vendor,
    amount,
    description: form.get("description") ? String(form.get("description")) : null,
    receipt_key: receipt_key ?? null,
    created_by: viewer?.id ?? null,
    created_at: new Date().toISOString(),
  };

  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare(
      "INSERT INTO expenses (id, society_id, category, vendor, amount, description, receipt_key, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(expense.id, expense.society_id, expense.category, expense.vendor, expense.amount, expense.description, expense.receipt_key, expense.created_by, expense.created_at).run();
  } else {
    mockStore().expenses.push(expense);
  }
  return NextResponse.json(expense, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM expenses WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    const denied = await requireSocietyOffice(row.society_id, "treasurer");
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.expenses.findIndex((e) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  const denied = await requireSocietyOffice(store.expenses[idx].society_id, "treasurer");
  if (denied) return denied;
  store.expenses.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
