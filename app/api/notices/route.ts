import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore, uid } from "@/lib/cloudflare";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM notices WHERE society_id = ? ORDER BY created_at DESC")
      .bind(society_id)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().notices.filter((n) => n.society_id === society_id));
}

export async function POST(req: Request) {
  const body = await req.json();
  const notice = {
    id: uid("n"),
    title: String(body.title ?? "New notice"),
    body: String(body.body ?? ""),
    audience: String(body.audience ?? "all"),
    society_id: String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO notices (id, title, body, audience, society_id) VALUES (?, ?, ?, ?, ?)")
      .bind(notice.id, notice.title, notice.body, notice.audience, notice.society_id)
      .run();
  } else {
    mockStore().notices.push(notice);
  }
  return NextResponse.json(notice, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const res = await env.DB.prepare("DELETE FROM notices WHERE id = ?").bind(id).run();
    if (res.meta.changes === 0) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.notices.findIndex((n) => n.id === id);
  if (idx === -1) return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  store.notices.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
