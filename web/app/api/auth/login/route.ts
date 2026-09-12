import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSession, sessionCookieOptions, verifyLogin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email = "", password = "" } = await req.json().catch(() => ({}));
  const { user, error } = await verifyLogin(String(email), String(password));
  if (!user) return NextResponse.json({ error }, { status: 401 });
  (await cookies()).set(SESSION_COOKIE, await createSession(user.id), sessionCookieOptions());
  return NextResponse.json({ user });
}
