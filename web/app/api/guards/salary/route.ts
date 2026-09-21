import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { getViewer, requireSocietyAdmin } from "@/lib/auth";
import { getGuardSalaryConfig, listGuardSalaryConfig, setGuardSalaryConfig } from "@/lib/guard";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Salary config — office-bearer-set monthly amount per guard.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const society_id = url.searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const guard_id = url.searchParams.get("guard");
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  if (guard_id) return NextResponse.json((await getGuardSalaryConfig(guard_id)) ?? null);
  return NextResponse.json(await listGuardSalaryConfig(society_id));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const guard_id = String(body.guard_id ?? "");
  const monthly_amount = Number(body.monthly_amount);
  if (!guard_id) return NextResponse.json({ error: "Provide guard_id." }, { status: 400 });
  if (!Number.isFinite(monthly_amount) || monthly_amount <= 0) {
    return NextResponse.json({ error: "Provide a valid monthly amount > 0." }, { status: 400 });
  }
  const viewer = await getViewer();
  const config = await setGuardSalaryConfig(guard_id, society_id, monthly_amount, viewer!.id);
  await logAudit({
    actorId: viewer!.id,
    action: "guard.salary_config.update",
    societyId: society_id,
    targetUserId: guard_id,
    detail: `₹${monthly_amount}/month`,
    ip: getRequestIp(req),
  });
  return NextResponse.json(config);
}
