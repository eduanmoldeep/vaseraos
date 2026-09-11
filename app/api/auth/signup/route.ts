import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, createUser, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { name = "", email = "", password = "" } = await req.json().catch(() => ({}));
  const { user, error } = await createUser(String(name), String(email), String(password));
  if (!user) return NextResponse.json({ error }, { status: 400 });
  (await cookies()).set("vasera_session", await createSession(user.id), sessionCookieOptions());
  return NextResponse.json({ user });
}
