import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { getViewer } from "@/lib/auth";
import { getMyResident } from "@/lib/membership";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const resident = await getMyResident(viewer.id, viewer.email, society_id);
  return NextResponse.json({ flat: resident?.flat ?? null, owner_tenant: resident?.owner_tenant ?? null });
}
