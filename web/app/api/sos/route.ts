import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { getViewer, requireSocietyMember } from "@/lib/auth";
import { getGuardFromToken } from "@/lib/guard";
import { listActiveSos, notifyGuards, raiseSos } from "@/lib/sos";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/** Either a resident/office-holder of the society (web) or the society's own guard (mobile) may read active alerts. */
export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const memberDenied = await requireSocietyMember(society_id);
  if (memberDenied) {
    const guard = await getGuardFromToken(bearerToken(req));
    if (!guard || guard.society_id !== society_id) return memberDenied;
  }
  return NextResponse.json(await listActiveSos(society_id));
}

/** Any resident raises an SOS for their own society — the panic button. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const viewer = await getViewer();
  const alert = await raiseSos(society_id, viewer!.id, String(body.flat ?? ""));
  await notifyGuards(society_id, alert);
  await logAudit({ actorId: viewer!.id, action: "sos.raise", societyId: society_id, detail: alert.flat, ip: getRequestIp(req) });
  return NextResponse.json(alert, { status: 201 });
}
