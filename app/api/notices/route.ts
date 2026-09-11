import { NextResponse } from "next/server";
import { getEnv, mockStore, uid } from "@/lib/cloudflare";

export const runtime = "edge";

export async function GET() {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM notices ORDER BY created_at DESC").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().notices);
}

export async function POST(req: Request) {
  const body = await req.json();
  const notice = {
    id: uid("n"),
    title: String(body.title ?? "New notice"),
    body: String(body.body ?? ""),
    audience: String(body.audience ?? "all"),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO notices (id, title, body, audience) VALUES (?, ?, ?, ?)")
      .bind(notice.id, notice.title, notice.body, notice.audience)
      .run();
  } else {
    mockStore().notices.push(notice);
  }
  return NextResponse.json(notice, { status: 201 });
}
