import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, type Cadence } from "@/lib/cloudflare";
import { getViewer, requireSocietyMember, requireSocietyOffice } from "@/lib/auth";
import { CADENCES, ensureMaintenanceDue, getMaintenanceSetting, setMaintenanceSetting } from "@/lib/maintenance";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const setting = await getMaintenanceSetting(society_id);
  return NextResponse.json(setting ?? null);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyOffice(society_id, "treasurer");
  if (denied) return denied;
  const amount = Number(body.amount);
  const cadence = String(body.cadence ?? "monthly") as Cadence;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Provide a valid due amount." }, { status: 400 });
  }
  if (!CADENCES.includes(cadence)) {
    return NextResponse.json({ error: "Cadence must be monthly, quarterly or yearly." }, { status: 400 });
  }
  const upiIdRaw = String(body.upi_id ?? "").trim();
  if (upiIdRaw && !/^[\w.+-]{2,256}@[a-zA-Z][\w.-]{1,64}$/.test(upiIdRaw)) {
    return NextResponse.json({ error: "That doesn't look like a valid UPI ID (e.g. name@bank)." }, { status: 400 });
  }
  const upi_id = upiIdRaw || null;
  const viewer = await getViewer();
  const setting = await setMaintenanceSetting(society_id, amount, cadence, viewer!.id, upi_id);
  await ensureMaintenanceDue(society_id);
  await logAudit({
    actorId: viewer!.id,
    action: "maintenance.settings.update",
    societyId: society_id,
    detail: `₹${amount} ${cadence}${upi_id ? ` · UPI ${upi_id}` : ""}`,
    ip: getRequestIp(req),
  });
  return NextResponse.json(setting);
}
