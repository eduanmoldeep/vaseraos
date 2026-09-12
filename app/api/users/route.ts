import { NextResponse } from "next/server";
import { createUser, listUsers, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (gate) return gate;
  return NextResponse.json(await listUsers());
}

/** Admin creates a login account directly. Still non-admin by default — same as self-signup. */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate) return gate;
  const { name = "", email = "", password = "" } = await req.json().catch(() => ({}));
  const { user, error } = await createUser(String(name), String(email), String(password));
  if (!user) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(user, { status: 201 });
}
