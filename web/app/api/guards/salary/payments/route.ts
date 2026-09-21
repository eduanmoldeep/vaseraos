import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { getViewer, requireSocietyAdmin } from "@/lib/auth";
import { currentPeriod } from "@/lib/maintenance";
import { logGuardSalaryPayment, listGuardSalaryPayments } from "@/lib/guard";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Payment log — one row per payment, so a partial/early payment (guard asks for
// urgency cash mid-month) and the later top-up both land as separate entries
// against the same period.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const society_id = url.searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const guard_id = url.searchParams.get("guard") ?? undefined;
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  return NextResponse.json(await listGuardSalaryPayments(society_id, guard_id));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;

  const guard_id = String(body.guard_id ?? "");
  const amount = Number(body.amount);
  if (!guard_id) return NextResponse.json({ error: "Provide guard_id." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Provide a valid amount > 0." }, { status: 400 });

  const period = String(body.period ?? "").trim() || currentPeriod("monthly");
  const early = Boolean(body.early);
  const note = body.note ? String(body.note) : undefined;
  if (early && !note?.trim()) {
    return NextResponse.json({ error: "Give a reason for an early/partial payment." }, { status: 400 });
  }

  const viewer = await getViewer();
  const payment = await logGuardSalaryPayment(guard_id, society_id, amount, period, early, note, viewer!.id);
  await logAudit({
    actorId: viewer!.id,
    action: early ? "guard.salary.early_payment" : "guard.salary.payment",
    societyId: society_id,
    targetUserId: guard_id,
    detail: `₹${amount} for ${period}${note ? ` · ${note}` : ""}`,
    ip: getRequestIp(req),
  });
  return NextResponse.json(payment, { status: 201 });
}
