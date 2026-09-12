import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { getViewer, requireSocietyAdmin } from "@/lib/auth";
import { createGuard, deactivateGuard, listGuards } from "@/lib/guard";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  return NextResponse.json(await listGuards(society_id));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const { guard, error } = await createGuard(society_id, String(body.name ?? ""), String(body.phone ?? ""), String(body.password ?? ""), body.email ? String(body.email) : undefined);
  if (!guard) return NextResponse.json({ error }, { status: 400 });
  const viewer = await getViewer();
  await logAudit({ actorId: viewer!.id, action: "guard.create", societyId: society_id, detail: guard.name, ip: getRequestIp(req) });
  return NextResponse.json(guard, { status: 201 });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const society_id = url.searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const ok = await deactivateGuard(id, society_id);
  if (!ok) return NextResponse.json({ error: "Guard not found." }, { status: 404 });
  const viewer = await getViewer();
  await logAudit({ actorId: viewer!.id, action: "guard.deactivate", societyId: society_id, targetUserId: id, ip: getRequestIp(req) });
  return NextResponse.json({ ok: true, id });
}
