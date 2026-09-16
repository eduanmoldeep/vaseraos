import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";

export const runtime = "nodejs";

/** The VAPID public key — safe to expose, needed client-side for pushManager.subscribe(). */
export async function GET() {
  const env = await getEnv();
  return NextResponse.json({ key: env?.VAPID_PUBLIC_KEY ?? null });
}
