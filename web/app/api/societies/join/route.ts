import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getRequestIp, logAudit } from "@/lib/audit";
import { addMembership, findSocietyByJoinCode } from "@/lib/membership";

export const runtime = "nodejs";

/** Any signed-in user joins an already-approved society as a resident, via its join code. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { code = "" } = await req.json().catch(() => ({}));
  const cleanCode = String(code).trim().toUpperCase();
  if (!cleanCode) return NextResponse.json({ error: "Provide a join code." }, { status: 400 });
  const society = await findSocietyByJoinCode(cleanCode);
  if (!society) return NextResponse.json({ error: "That join code doesn't match any society." }, { status: 404 });
  await addMembership(viewer.id, society.id);
  await logAudit({ actorId: viewer.id, action: "membership.join", societyId: society.id, ip: getRequestIp(req) });
  return NextResponse.json({ society });
}
