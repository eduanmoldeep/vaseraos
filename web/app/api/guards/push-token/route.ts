import { NextResponse } from "next/server";
import { registerPushToken, requireGuard } from "@/lib/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = await requireGuard(req);
  if (gate instanceof NextResponse) return gate;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const platform = body.platform === "ios" ? "ios" : "android";
  await registerPushToken(gate.guard.id, platform, body.expo_token ? String(body.expo_token) : undefined, body.voip_token ? String(body.voip_token) : undefined);
  return NextResponse.json({ ok: true });
}
