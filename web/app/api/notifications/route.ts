import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { getViewer } from "@/lib/auth";
import { listNotifications, markRead, unreadCount } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const [items, unread] = await Promise.all([
    listNotifications(viewer.id, society_id),
    unreadCount(viewer.id, society_id),
  ]);
  return NextResponse.json({ unread, items });
}

/** Marks one notification read ({id}) or every unread one for a society ({society_id}). */
export async function PATCH(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? DEFAULT_SOCIETY_ID);
  await markRead(viewer.id, society_id, body.id ? String(body.id) : undefined);
  return NextResponse.json({ ok: true });
}
