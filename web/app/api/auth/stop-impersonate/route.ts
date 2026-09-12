import { NextResponse } from "next/server";
import { getViewer, stopImpersonation } from "@/lib/auth";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const impersonated = await getViewer();
  const { user, error } = await stopImpersonation();
  if (!user) return NextResponse.json({ error }, { status: 400 });
  await logAudit({ actorId: user.id, action: "impersonate.stop", targetUserId: impersonated?.id, ip: getRequestIp(req) });
  return NextResponse.json({ user });
}
