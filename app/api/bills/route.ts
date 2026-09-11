import { NextResponse } from "next/server";
import { getEnv, mockStore, uid } from "@/lib/cloudflare";

export const runtime = "edge";

export async function GET() {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM maintenance_bills ORDER BY month DESC").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().bills);
}

export async function POST(req: Request) {
  const body = await req.json();
  const bill = {
    id: uid("b"),
    flat: String(body.flat ?? "A-101"),
    amount: Number(body.amount ?? 0),
    month: String(body.month ?? "2026-09"),
    status: (["pending", "paid", "overdue"].includes(body.status) ? body.status : "pending") as "pending" | "paid" | "overdue",
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO maintenance_bills (id, flat, amount, month, status) VALUES (?, ?, ?, ?, ?)")
      .bind(bill.id, bill.flat, bill.amount, bill.month, bill.status)
      .run();
  } else {
    mockStore().bills.push(bill);
  }
  return NextResponse.json(bill, { status: 201 });
}
