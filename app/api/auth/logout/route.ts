import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IMPERSONATOR_COOKIE, SESSION_COOKIE, destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  jar.delete(SESSION_COOKIE);
  jar.delete(IMPERSONATOR_COOKIE);
  return NextResponse.json({ ok: true });
}
