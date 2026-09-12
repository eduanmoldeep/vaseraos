import { NextResponse } from "next/server";
import { getViewer, requireAdmin, startImpersonation } from "@/lib/auth";
import { getRequestIp, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate) return gate;
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
  const admin = await getViewer();
  const { user, error } = await startImpersonation(String(userId));
  if (!user) return NextResponse.json({ error }, { status: 400 });
  await logAudit({ actorId: admin!.id, action: "impersonate.start", targetUserId: user.id, ip: getRequestIp(req) });
  return NextResponse.json({ user });
}
