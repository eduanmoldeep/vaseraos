import { NextResponse } from "next/server";
import { getViewer, requireSocietyAdmin } from "@/lib/auth";
import { getGuardFromToken } from "@/lib/guard";
import { acknowledgeSos, getSos, resolveSos } from "@/lib/sos";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/** `{action:"acknowledge"}` — the society's own guard only. `{action:"resolve"}` — any office-holder. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/sos/[id]">) {
  const { id } = await ctx.params;
  const alert = await getSos(id);
  if (!alert) return NextResponse.json({ error: "SOS alert not found." }, { status: 404 });
  const body = await req.json().catch(() => null);
  const action = body && typeof body === "object" ? String(body.action ?? "") : "";

  if (action === "acknowledge") {
    const guard = await getGuardFromToken(bearerToken(req));
    if (!guard || guard.society_id !== alert.society_id) {
      return NextResponse.json({ error: "Guard login required for this society." }, { status: 401 });
    }
    const updated = await acknowledgeSos(id, guard.id);
    await logAudit({ actorId: guard.id, action: "sos.acknowledge", societyId: alert.society_id, detail: alert.flat, ip: getRequestIp(req) });
    return NextResponse.json(updated);
  }

  if (action === "resolve") {
    const denied = await requireSocietyAdmin(alert.society_id);
    if (denied) return denied;
    const viewer = await getViewer();
    const updated = await resolveSos(id);
    await logAudit({ actorId: viewer!.id, action: "sos.resolve", societyId: alert.society_id, detail: alert.flat, ip: getRequestIp(req) });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be 'acknowledge' or 'resolve'." }, { status: 400 });
}
