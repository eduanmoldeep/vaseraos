import { NextResponse } from "next/server";
import { getEnv, mockStore, uid } from "@/lib/cloudflare";

export const runtime = "edge";

export async function GET() {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM complaints ORDER BY created_at DESC").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().complaints);
}

export async function POST(req: Request) {
  const body = await req.json();
  const complaint = {
    id: uid("c"),
    flat: String(body.flat ?? "A-101"),
    title: String(body.title ?? "New complaint"),
    category: String(body.category ?? "general"),
    status: (["open", "in_progress", "resolved"].includes(body.status) ? body.status : "open") as "open" | "in_progress" | "resolved",
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO complaints (id, flat, title, category, status) VALUES (?, ?, ?, ?, ?)")
      .bind(complaint.id, complaint.flat, complaint.title, complaint.category, complaint.status)
      .run();
  } else {
    mockStore().complaints.push(complaint);
  }
  return NextResponse.json(complaint, { status: 201 });
}
