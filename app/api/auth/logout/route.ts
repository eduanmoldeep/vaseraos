import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
