import { NextResponse } from "next/server";
import { getEnv, mockStore, uid } from "@/lib/cloudflare";

export const runtime = "edge";

export async function GET() {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM visitors ORDER BY created_at DESC").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().visitors);
}

export async function POST(req: Request) {
  const body = await req.json();
  const visitor = {
    id: uid("v"),
    name: String(body.name ?? "Guest"),
    flat: String(body.flat ?? "A-101"),
    purpose: String(body.purpose ?? "visit"),
    status: (["expected", "checked_in", "checked_out"].includes(body.status) ? body.status : "expected") as
      | "expected"
      | "checked_in"
      | "checked_out",
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO visitors (id, name, flat, purpose, status) VALUES (?, ?, ?, ?, ?)")
      .bind(visitor.id, visitor.name, visitor.flat, visitor.purpose, visitor.status)
      .run();
  } else {
    mockStore().visitors.push(visitor);
  }
  return NextResponse.json(visitor, { status: 201 });
}
