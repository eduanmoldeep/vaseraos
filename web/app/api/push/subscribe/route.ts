import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { hasPushSubscription, removePushSubscription, savePushSubscription } from "@/lib/push";

export const runtime = "nodejs";

/** Whether the caller has any push subscription on file — drives the UserMenu toggle state. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  return NextResponse.json({ subscribed: await hasPushSubscription(viewer.id) });
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint ? String(body.endpoint) : "";
  const p256dh = body?.keys?.p256dh ? String(body.keys.p256dh) : "";
  const auth = body?.keys?.auth ? String(body.keys.auth) : "";
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  await savePushSubscription(viewer.id, { endpoint, keys: { p256dh, auth } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint ? String(body.endpoint) : "";
  if (!endpoint) return NextResponse.json({ error: "Provide endpoint." }, { status: 400 });
  await removePushSubscription(endpoint, viewer.id);
  return NextResponse.json({ ok: true });
}
