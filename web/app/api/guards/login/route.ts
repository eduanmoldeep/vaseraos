import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID } from "@/lib/cloudflare";
import { createGuardSession, verifyGuardLogin } from "@/lib/guard";

export const runtime = "nodejs";

/** Guard app login — bearer token in the response body, not a cookie (mobile clients don't want cookie jars). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const { guard, error } = await verifyGuardLogin(society_id, String(body.phone ?? ""), String(body.password ?? ""));
  if (!guard) return NextResponse.json({ error }, { status: 401 });
  const token = await createGuardSession(guard.id);
  return NextResponse.json({ token, guard });
}
