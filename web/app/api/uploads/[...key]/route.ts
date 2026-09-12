import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireSocietyMember } from "@/lib/auth";

export const runtime = "nodejs";

/** Serves a receipt from R2. Key shape: receipts/{society_id}/{file} — gated to members of that society. */
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[...key]">) {
  const { key: parts } = await ctx.params;
  if (parts[0] !== "receipts" || !parts[1]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const societyId = parts[1];
  const denied = await requireSocietyMember(societyId);
  if (denied) return denied;

  const env = await getEnv();
  const obj = await env?.UPLOADS.get(parts.join("/"));
  if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(obj.body as ReadableStream, {
    headers: { "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream" },
  });
}
