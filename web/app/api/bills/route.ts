import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, DEFAULT_SOCIETY_ID, type Bill } from "@/lib/cloudflare";
import { getViewer, requireSocietyAdmin, requireSocietyMember, requireSocietyOffice } from "@/lib/auth";
import { getMyFlat } from "@/lib/membership";
import { ensureMaintenanceDue } from "@/lib/maintenance";
import { storeReceipt } from "@/lib/uploads";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** Admins see every bill; `?mine=1` scopes a member to just their own flat's bills. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const society_id = url.searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const mine = url.searchParams.get("mine") === "1";

  if (mine) {
    const denied = await requireSocietyMember(society_id);
    if (denied) return denied;
    const viewer = (await getViewer())!;
    const flat = await getMyFlat(viewer.id, viewer.email, society_id);
    if (!flat) return NextResponse.json([]);
    await ensureMaintenanceDue(society_id);
    const env = await getEnv();
    if (env?.DB) {
      const { results } = await env.DB.prepare("SELECT * FROM maintenance_bills WHERE society_id = ? AND flat = ? ORDER BY month DESC")
        .bind(society_id, flat)
        .all();
      return NextResponse.json(results);
    }
    return NextResponse.json(mockStore().bills.filter((b) => b.society_id === society_id && b.flat === flat));
  }

  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  await ensureMaintenanceDue(society_id);
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
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  // Raising a bill is the treasurer's call — same office that owns the dues config.
  const denied = await requireSocietyOffice(society_id, "treasurer");
  if (denied) return denied;
  const bill = {
    id: uid("b"),
    flat: String(body.flat ?? "A-101"),
    amount: Number(body.amount ?? 0),
    month: String(body.month ?? "2026-09"),
    status: (["pending", "paid", "overdue"].includes(body.status) ? body.status : "pending") as "pending" | "paid" | "overdue",
    society_id,
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

const BILL_STATUSES = ["pending", "pending_verification", "paid", "overdue"] as const;

/**
 * Accepts JSON ({id, status}) or multipart/form-data (same fields, plus an optional
 * `receipt` file). Two paths:
 * - status "pending_verification": self-service — a resident submitting UPI payment
 *   proof for their OWN bill. No admin rights needed, but a screenshot is required.
 * - any other status: the existing treasurer/admin path (approve → paid, reject →
 *   back to pending and the unverified screenshot is cleared, or raw pending/overdue
 *   bookkeeping). Optional receipt replaces the stored one.
 */
export async function PATCH(req: Request) {
  const isMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  let id: string, status: string, receiptFile: File | null = null;
  if (isMultipart) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    id = String(form.get("id") ?? "");
    status = String(form.get("status") ?? "");
    receiptFile = form.get("receipt") as File | null;
  } else {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    id = String(body.id ?? "");
    status = String(body.status ?? "");
  }
  if (!id || !BILL_STATUSES.includes(status as (typeof BILL_STATUSES)[number])) {
    return NextResponse.json({ error: "Provide id and valid status: pending | pending_verification | paid | overdue" }, { status: 400 });
  }

  const env = await getEnv();

  if (status === "pending_verification") {
    if (!receiptFile || receiptFile.size === 0) {
      return NextResponse.json({ error: "Upload a screenshot of the payment." }, { status: 400 });
    }
    const findBill = env?.DB
      ? await env.DB.prepare("SELECT * FROM maintenance_bills WHERE id = ?").bind(id).first<Bill>()
      : mockStore().bills.find((b) => b.id === id);
    if (!findBill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const denied = await requireSocietyMember(findBill.society_id);
    if (denied) return denied;
    const viewer = (await getViewer())!;
    const myFlat = await getMyFlat(viewer.id, viewer.email, findBill.society_id);
    if (myFlat !== findBill.flat) {
      return NextResponse.json({ error: "That's not your bill." }, { status: 403 });
    }
    let receipt_key: string | undefined;
    try {
      receipt_key = await storeReceipt(findBill.society_id, receiptFile);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't store the screenshot." }, { status: 400 });
    }
    if (env?.DB) {
      await env.DB.prepare("UPDATE maintenance_bills SET status = 'pending_verification', receipt_key = ? WHERE id = ?")
        .bind(receipt_key ?? null, id)
        .run();
      const updated = await env.DB.prepare("SELECT * FROM maintenance_bills WHERE id = ?").bind(id).first();
      return NextResponse.json(updated);
    }
    const bill = mockStore().bills.find((b) => b.id === id)!;
    bill.status = "pending_verification";
    bill.receipt_key = receipt_key ?? bill.receipt_key;
    return NextResponse.json(bill);
  }

  // Treasurer/admin path: approve (paid), reject (pending — clears the screenshot), or raw bookkeeping.
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM maintenance_bills WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    let receipt_key: string | undefined;
    try {
      receipt_key = await storeReceipt(row.society_id, receiptFile);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't store receipt." }, { status: 400 });
    }
    const paid_at = status === "paid" ? new Date().toISOString() : null;
    const receiptExpr = status === "pending" ? "NULL" : "COALESCE(?, receipt_key)";
    const bindings = status === "pending" ? [status, paid_at, id] : [status, paid_at, receipt_key ?? null, id];
    await env.DB.prepare(`UPDATE maintenance_bills SET status = ?, paid_at = ?, receipt_key = ${receiptExpr} WHERE id = ?`)
      .bind(...bindings)
      .run();
    const updated = await env.DB.prepare("SELECT * FROM maintenance_bills WHERE id = ?").bind(id).first<Bill>();
    const viewer = await getViewer();
    if (viewer) await logAudit({ actorId: viewer.id, action: "bill.status_update", societyId: row.society_id, detail: `${updated?.flat ?? id} → ${status}`, ip: getRequestIp(req) });
    return NextResponse.json(updated);
  }
  const bill = mockStore().bills.find((b) => b.id === id);
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(bill.society_id);
  if (denied) return denied;
  bill.status = status as Bill["status"];
  bill.paid_at = status === "paid" ? new Date().toISOString() : null;
  if (status === "pending") bill.receipt_key = null;
  const viewer = await getViewer();
  if (viewer) await logAudit({ actorId: viewer.id, action: "bill.status_update", societyId: bill.society_id, detail: `${bill.flat} → ${status}`, ip: getRequestIp(req) });
  return NextResponse.json(bill);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM maintenance_bills WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM maintenance_bills WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.bills.findIndex((b) => b.id === id);
  if (idx === -1) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(store.bills[idx].society_id);
  if (denied) return denied;
  store.bills.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
