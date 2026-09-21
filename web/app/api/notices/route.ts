import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore, uid } from "@/lib/cloudflare";
import { getViewer, requireSocietyAdmin, requireSocietyMember, requireSocietyOffice } from "@/lib/auth";
import { notifySociety } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
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
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  // Notice creation is the president's call specifically — secretary/treasurer can't post one.
  const denied = await requireSocietyOffice(society_id, "president");
  if (denied) return denied;
  const notice = {
    id: uid("n"),
    title: String(body.title ?? "New notice"),
    body: String(body.body ?? ""),
    audience: String(body.audience ?? "all"),
    society_id,
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO notices (id, title, body, audience, society_id) VALUES (?, ?, ?, ?, ?)")
      .bind(notice.id, notice.title, notice.body, notice.audience, notice.society_id)
      .run();
  } else {
    mockStore().notices.push(notice);
  }
  const viewer = await getViewer();
  await notifySociety(society_id, `New notice: ${notice.title}`, notice.body.slice(0, 140), viewer?.id, `/notices#n_${notice.id}`);
  return NextResponse.json(notice, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM notices WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM notices WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.notices.findIndex((n) => n.id === id);
  if (idx === -1) return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(store.notices[idx].society_id);
  if (denied) return denied;
  store.notices.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
