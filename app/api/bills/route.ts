import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, DEFAULT_SOCIETY_ID, type Bill } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM maintenance_bills WHERE society_id = ? ORDER BY month DESC")
      .bind(society_id)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().bills.filter((b) => b.society_id === society_id));
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  const bill = {
    id: uid("b"),
    flat: String(body.flat ?? "A-101"),
    amount: Number(body.amount ?? 0),
    month: String(body.month ?? "2026-09"),
    status: (["pending", "paid", "overdue"].includes(body.status) ? body.status : "pending") as "pending" | "paid" | "overdue",
    society_id: String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO maintenance_bills (id, flat, amount, month, status, society_id) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(bill.id, bill.flat, bill.amount, bill.month, bill.status, bill.society_id)
      .run();
  } else {
    mockStore().bills.push(bill);
  }
  return NextResponse.json(bill, { status: 201 });
}

const BILL_STATUSES = ["pending", "paid", "overdue"] as const;

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !BILL_STATUSES.includes(status as (typeof BILL_STATUSES)[number])) {
    return NextResponse.json({ error: "Provide id and valid status: pending | paid | overdue" }, { status: 400 });
  }
  const env = await getEnv();
  if (env?.DB) {
    const res = await env.DB.prepare("UPDATE maintenance_bills SET status = ? WHERE id = ?")
      .bind(status, id)
      .run();
    if (res.meta.changes === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    const row = await env.DB.prepare("SELECT * FROM maintenance_bills WHERE id = ?").bind(id).first();
    return NextResponse.json(row);
  }
  const bill = mockStore().bills.find((b) => b.id === id);
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  bill.status = status as Bill["status"];
  return NextResponse.json(bill);
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const res = await env.DB.prepare("DELETE FROM maintenance_bills WHERE id = ?").bind(id).run();
    if (res.meta.changes === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.bills.findIndex((b) => b.id === id);
  if (idx === -1) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  store.bills.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
