import { NextResponse } from "next/server";
import { type Office } from "@/lib/cloudflare";
import { getViewer, listUsers, requireSocietyAdmin } from "@/lib/auth";
import { getRequestIp, logAudit } from "@/lib/audit";
import { getOffices, getSocietyMembers, setOffices } from "@/lib/membership";

export const runtime = "nodejs";

const OFFICES: Office[] = ["president", "secretary", "treasurer"];

/** Every member of a society with the offices they currently hold — for the roles-assignment page. */
export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? "";
  if (!society_id) return NextResponse.json({ error: "Provide ?society=" }, { status: 400 });
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const members = await getSocietyMembers(society_id);
  const users = await listUsers();
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = await Promise.all(
    members.map(async (m) => ({
      userId: m.userId,
      name: byId.get(m.userId)?.name ?? "Unknown",
      email: byId.get(m.userId)?.email ?? "",
      offices: await getOffices(m.userId, society_id),
    }))
  );
  return NextResponse.json(rows);
}

/** Replaces the full set of offices one member holds — privilege moves with the office, not the person. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? "");
  const userId = String(body.userId ?? "");
  const offices = Array.isArray(body.offices) ? body.offices.filter((o: unknown): o is Office => OFFICES.includes(o as Office)) : [];
  if (!society_id || !userId) return NextResponse.json({ error: "Provide society_id and userId." }, { status: 400 });
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const viewer = await getViewer();
  await setOffices(society_id, userId, offices);
  await logAudit({
    actorId: viewer!.id,
    action: "office.assign",
    targetUserId: userId,
    societyId: society_id,
    detail: `offices=${offices.join(",") || "none"}`,
    ip: getRequestIp(req),
  });
  return NextResponse.json({ ok: true, userId, offices });
}
