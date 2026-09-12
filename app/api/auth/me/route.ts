import { NextResponse } from "next/server";
import { getImpersonator, getViewer } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const impersonatedBy = await getImpersonator();
  return NextResponse.json({ user: viewer, impersonatedBy });
}
